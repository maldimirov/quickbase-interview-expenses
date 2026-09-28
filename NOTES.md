# Expense Requests Notes

This document records the important implementation choices, their tradeoffs, and material changes made after discussing the initial proposal. A full conversation export will be added separately.

## Current design decisions

### Technology choices

- Use TypeScript for both the React frontend and the Node.js backend.
- Keep `api` and `ui` as independent npm projects. Each project owns its package manifest, lockfile, dependencies, TypeScript configuration, scripts, and build output.
- Use Vite for the frontend development server and production build. Vite is an established React build tool, is included in React's official build-from-scratch guidance, and keeps the client setup small.
- Use Zod only in the API layer to validate untrusted JSON at runtime and infer the corresponding API-layer TypeScript types. Business validation remains explicit business-layer code.
- Do not add an automated test suite initially. Record the manual verification that is actually performed before submission.
- Prefer established libraries and platform features over newer or experimental alternatives.
- Give repeated identifiers and domain or state values named constants or enums instead of duplicating string literals. One-off display text does not need a constant.

### Backend layering

The backend has three layers with dependencies flowing downward:

```text
API -> Business -> DB
```

Each layer owns its models. The calling layer converts between its own models and the called layer's models. The API layer therefore converts API models to business models, and the business layer converts business models to DB models. Lower layers remain unaware of their callers.

Business modules use namespace-qualified DB calls such as `db.readHealth()` so persistence operations remain explicit at each call site.

- The API layer owns HTTP handling, `X-User-Id` resolution, Zod request schemas, and HTTP response mapping.
- The business layer owns authorization, submission validation, state transitions, approval routing, and response composition.
- The DB layer owns the in-memory records, ID allocation, and atomic status-history insertion.

`api/src/app.ts` is the HTTP composition root that configures Express and mounts the API router. `api/src/index.ts` owns only process startup and listening. The API router declares paths, while API handlers convert between HTTP and business-layer models.

### User identity

The client sends the selected user in the `X-User-Id` header. API middleware resolves it to a known user before calling the business layer. Actor, requester, status, approver, and history data are never trusted from editable request fields.

This models where real authentication middleware would provide a trusted current user, but the header itself is only a demo substitute for authentication.

### Expense request data

Retain the supplied seed-data shape by grouping editable fields inside a strongly typed `values` object. `ExpenseValues` defines every field and its type; it is not a dynamic key-value map.

The `values` boundary keeps all user-editable form data together so the API can strictly validate and replace it as one unit. Requester, status, approver, and history remain server-controlled outside that object. A future relational DB model may still map the typed value fields to ordinary columns rather than storing them as JSON.

Draft fields that have no value are represented explicitly as `null`. A draft `values` object includes all fields, while submission validation decides whether the current values are complete and valid. `billable` is a non-null boolean with a default of `false`.

Request data and status history are separate data structures. API detail and list responses are read models assembled by the business layer and include the latest status information without embedding the complete history.

The request detail response includes at least:

- The typed expense request `values`.
- The current status.
- The latest status sequence.
- The currently assigned approver when applicable.

The full status history is retrieved from a separate endpoint. No endpoint requires pagination for this assignment.

### Status history and concurrency

Status history is append-only. Each record contains the request ID, sequence, action, new status, actor, and timestamp. A submit or resubmit record also contains the server-selected approver so the assignment remains part of the workflow history.

The sequence is unique and monotonically increasing within a request. A status command contains the sequence observed by the client. The business operation performs an early optimistic check for a useful error, while the DB layer performs the decisive compare-and-insert when appending the new status.

In a SQL implementation, inserting `expectedStatusSequence + 1` with a unique constraint on `(requestId, sequence)` provides the final concurrency check. A conflicting insert becomes an HTTP `409 Conflict`. The in-memory DB method mirrors that operation synchronously.

Draft updates also provide the expected status sequence. This prevents an update from succeeding after a concurrent status transition. Two concurrent updates while the request remains Draft use last-write-wins semantics. That is accepted because only the requester may edit the draft.

### Draft validation and replacement

Use `PUT /api/requests/:id` to replace the complete `values` object. All editable fields are resubmitted, shape-validated, and stored together. Omitted fields are not retained accidentally; nullable fields explicitly use `null` when absent.

API shape validation always applies. Submission business rules apply only when the user attempts to submit. An incomplete or business-invalid Draft can therefore be saved. The UI shows its submission problems as warnings, while a failed submit shows field errors.

Only Draft requests can be edited. Editing request data and changing status are separate operations.

### Workflow endpoint and transitions

Use one extensible status endpoint instead of one endpoint per operation:

```text
POST /api/requests/:id/status
```

The body contains an enum-backed action and the expected status sequence. Zod validates the body shape and action value; the business layer validates whether that actor may perform that action from the current status.

Core actions and transitions are:

```text
SUBMIT:   Draft     -> Submitted
WITHDRAW: Submitted -> Draft
APPROVE:  Submitted -> Approved
REJECT:   Submitted -> Rejected
```

`WITHDRAW` lets the requester correct a submitted request before it is decided. The withdrawal is visible in history, removes the current approval assignment, and prevents the previous approver from acting. Resubmission validates the request again and recomputes the approver.

The rejected-request extension is implemented last. It adds an owner-only `REOPEN` action from Rejected to Draft, after which the existing update and submit operations are reused.

### Approval routing

Keep approval selection in one business-layer function. It receives the requester, amount, and users, and returns the selected approver or a clear routing error. Submit and later resubmit use the same function. Neither the API handler nor the client selects the authoritative approver.

## Changes from the initial proposal

- The initial root-level npm project was split into independent `api` and `ui` projects so their dependencies, commands, and build artifacts have explicit ownership.
- Zod was initially questioned as unnecessary for the business-rule complexity. It was retained after clarifying that its purpose is runtime API-boundary validation, which TypeScript types alone cannot provide.
- Automated tests with Vitest and Supertest were removed from the initial scope. Manual verification will be documented instead.
- Status history was separated from expense request records and from the expense request history endpoint.
- Flat request fields were considered because they map directly to relational columns. The strongly typed nested `values` shape was retained because it matches the supplied data and creates a clear validation and full-replacement boundary without requiring JSON persistence.
- Partial `PATCH` updates were replaced by full `PUT` replacement so every editable field is resubmitted and shape-validated.
- Per-operation workflow endpoints were replaced by one status endpoint with an enum-backed action, making later operations additive without adding routes.
- The initial proposal made Submitted requests unable to return to Draft. This was revised to allow an explicit owner-only `WITHDRAW` transition, keeping edits restricted to Draft while making withdrawal visible to the approver and in history.
- Status sequence concurrency protects transitions and edit-versus-transition races. Concurrent Draft edits intentionally remain last-write-wins rather than adding a separate request revision.
- The rejected-request flow remains in scope but is deliberately implemented as the final separate iteration.
- Time estimates and timebox-driven cuts are not used to guide implementation scope.

## Implementation order

1. Establish the TypeScript, Node.js, React, Vite, and Zod project foundation.
2. Build the three backend layers, seed data, and `X-User-Id` handling.
3. Wire a required-fields Draft slice through create, list, detail, full update, and separate history retrieval.
4. Add the core status workflow, optimistic sequence checks, authorization, and approval routing.
5. Add conditional fields, submission validation, Draft warnings, and server field errors.
6. Add the history UI and complete the documented manual verification.
7. Add the rejected-request reopen, edit, and resubmit flow.
8. Complete run instructions, tradeoffs, verification results, and AI-use documentation.

## Verification performed

The independent API and UI projects were manually verified on 2026-09-28:

- `npm install` completed independently in `api` and `ui`, producing a lockfile for each project.
- `npm run typecheck` completed successfully in both projects.
- `npm run build` produced `api/dist` and `ui/dist`.
- `npm run dev` started each development server from its own project directory.
- `GET /api/health` returned `{"status":"ok"}` directly from the API and through Vite's `/api` development proxy.
- `npm start` ran the compiled API from `api`, whose health endpoint returned `{"status":"ok"}`.
- npm reported no known vulnerabilities in either project after installation.

No automated tests have been added or run.
