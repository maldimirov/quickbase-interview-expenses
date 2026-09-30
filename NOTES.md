# Expense Requests

This document summarizes the decisions that materially shape the application. The complete user-agent discussion is available in [AGENT_DISCUSSION.md](AGENT_DISCUSSION.md).

## Running the project

The project requires Node.js 22.12 or newer and npm 10 or newer.

```bash
npm run setup
npm run dev:api
npm run dev:ui
```

Run the API and UI commands in separate terminals, then open `http://localhost:5173`. The API listens on `http://localhost:3000`, and Vite proxies browser requests under `/api` to it.

The API uses in-memory storage, so restarting it restores the seed data. The following root commands verify both projects:

```bash
npm run typecheck
npm run build
```

## Architecture

The UI and API are independent TypeScript projects with their own dependencies and configuration. The root package contains only convenience scripts that delegate to them.

The API uses three layers with one-way dependencies:

```text
API -> Business -> DB
```

- The API layer owns Express routing, HTTP concerns, Zod request validation, and conversion to business models.
- The business layer owns authorization, submission rules, workflow transitions, approval routing, and conversion to persistence records.
- The DB layer owns the in-memory records, ID allocation, and sequence-checked history insertion.

Each layer defines the models it needs. The calling layer performs conversions, which keeps the lower layer independent of its caller. Business enums are the domain source of truth and are reused by API validation where the accepted values are identical. DB records deliberately use storage primitives because the in-memory store is a substitute for a database, not another domain layer.

Vite provides the React development and build tooling. Zod validates untrusted request JSON at the HTTP boundary; business rules remain explicit business-layer code. TypeScript alone cannot validate data received at runtime.

## Identity and server-owned data

`X-User-Id` represents the authenticated user for this demo. Middleware only checks that the header is present and passes the ID forward. The business layer resolves the user and performs authorization. This resembles an authentication boundary, but the header is not production authentication.

The server owns requester, status, approver, sequence, and history fields. Strict request schemas reject attempts to supply protected root fields rather than silently discarding them.

## Expense data and Draft behavior

Editable fields remain inside the supplied, strongly typed `values` object. This matches the seed-data shape and creates a clear boundary for validation and full replacement; it is not a dynamic key-value map. A future relational database could still store these fields in ordinary columns.

`PUT /api/requests/:id` replaces the complete `values` object. Nullable fields explicitly use `null` when absent, so a hidden conditional value cannot survive accidentally. Only the requester can edit a Draft.

Drafts may contain incomplete or temporarily invalid business values. Their JSON shape is always validated, but submission rules run only on `SUBMIT`. The UI therefore presents Draft problems as warnings and displays server field errors after a failed submission.

Submission requires:

- an expense type, non-negative amount, and non-blank description;
- a client exactly when the expense is billable;
- additional justification exactly when the amount is at least $1,000;
- an Other reason exactly when the expense type is Other.

The inverse conditions are intentional. For example, a non-billable request with a client is invalid rather than merely ignored.

The form tracks whether the user has changed a field. Save Draft is enabled only with unsaved changes, while Submit is enabled only after those changes have been saved. This is intentionally an interaction flag, not a deep comparison with persisted values.

## Workflow

All user-driven transitions use one extensible endpoint:

```text
POST /api/requests/:id/status
```

The body contains an enum-backed action and the status sequence last observed by the client.

```text
SUBMIT:   Draft     -> Submitted
WITHDRAW: Submitted -> Draft
APPROVE:  Submitted -> Approved
REJECT:   Submitted -> Rejected
REOPEN:   Rejected  -> Draft
```

Only the requester may submit, withdraw, or reopen. Only the assigned approver may approve or reject. Request values are editable only in Draft, so `WITHDRAW` and `REOPEN` make corrections explicit and visible in history. Every submission, including a resubmission, reruns validation and approval routing.

Expenses below $1,000 route to the requester's manager. A missing or self-referencing manager falls back to finance. Expenses of $1,000 or more route directly to finance. Submission fails if no eligible finance approver exists; a requester can never approve their own request.

## History and concurrency

Status history is stored separately and is append-only. Each entry records the request, sequence, action, new status, actor, timestamp, and any assigned approver. Current status is derived from the latest history entry, preventing a separate mutable status field from disagreeing with history.

Request details include the latest status sequence, so the UI does not need an extra history call before issuing a command. Business logic performs an early sequence check for a useful conflict response, and the DB append performs the decisive check immediately before insertion. A stale command returns `409 Conflict`.

Draft updates use the same status sequence to prevent an edit from racing with a transition. Concurrent Draft edits remain last-write-wins because only the requester can edit them. In SQL, history insertion would use a transaction and a unique constraint on `(requestId, sequence)`.

## API surface

```text
GET  /api/users
GET  /api/requests
POST /api/requests
GET  /api/requests/:id
PUT  /api/requests/:id
POST /api/requests/:id/status
GET  /api/requests/:id/history
```

All request endpoints require `X-User-Id`. History has its own endpoint and is not embedded in request responses.

## Important tradeoffs and discussion outcomes

- Zod was initially questioned because the business rules are straightforward. It was retained specifically for runtime validation of incoming JSON, not as a business-rule engine.
- Flat expense fields were considered for relational persistence. The typed nested `values` shape was retained because it matches the supplied data and supports a clear full-replacement contract.
- `PUT` was chosen over partial `PATCH` so every editable field is resubmitted and validated, and obsolete conditional values are removed explicitly.
- One status endpoint was chosen over one endpoint per action. The action enum makes workflow extensions additive while transition rules remain centralized in the business layer.
- Status is derived from separate history records rather than duplicated on the request. The sequence is both an ordering value and an optimistic concurrency version.
- Submitted requests cannot be edited directly. `WITHDRAW` returns them to Draft, and rejected requests use `REOPEN`, preserving an audit trail visible to the approver.
- Seed data is copied into project-owned DB-shaped records. Runtime conversion from the interview fixtures was avoided because it would add scaffolding without demonstrating business behavior.
- No automated test framework was added by agreement. The implemented behavior was instead exercised manually; automated business and API tests would be the first production-hardening step.

## Verification performed

The following checks were completed against the API and UI:

- Root `npm run typecheck` and `npm run build` pass for both projects.
- The API and UI start independently, and Vite's `/api` proxy reaches the API.
- Missing or unknown users are rejected, protected input fields are rejected, and actor-specific operations enforce ownership or assigned-approver rules.
- Drafts preserve incomplete values, full replacement works, and stale edit sequences are rejected.
- Submission validates base and conditional rules in both directions and returns field-specific `422` errors.
- Low-value requests route to the manager; high-value and manager-fallback requests route to finance without allowing self-approval.
- Submit, withdraw, approve, reject, reopen, edit, and resubmit flows produce ordered history and reject stale or invalid transitions.

No automated tests have been added or run.

## AI assistance

AI assisted with the initial plan, implementation, refactoring, manual verification scenarios, and this decision record. The implementation was developed interactively: proposals were reviewed and challenged, then revised around API validation, layering, data shape, concurrency, workflow endpoints, Draft behavior, seed handling, comments, and test scope.
