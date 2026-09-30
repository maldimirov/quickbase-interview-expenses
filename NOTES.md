# Expense Requests Notes

This document records the important implementation choices, their tradeoffs, and material changes made after discussing the initial proposal. A full conversation export will be added separately.

## Current design decisions

### Technology choices

- Use TypeScript for both the React frontend and the Node.js backend.
- Keep `api` and `ui` as independent npm projects. Each project owns its package manifest, lockfile, dependencies, TypeScript configuration, scripts, and build output.
- Use a dependency-free root package as a command dispatcher. Its scripts delegate with `npm --prefix`, so common setup, development, verification, and build commands can run from the repository root without npm workspaces or dependency hoisting.
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

Models are defined in each layer's `models.ts`. Conversions live in the calling layer's `convert.ts`, which keeps HTTP handlers and business operations focused on orchestration and rules. A layer does not have an empty conversion module when it has nothing to convert.

API error codes and error response shapes live in `api/errors.ts` rather than alongside ordinary request and response models.

The business layer owns domain enum values. API Zod schemas import those enums when the complete domain value set is also the accepted API value set, giving validation and business logic one source of truth. The API defines an explicit subset instead when an endpoint must not expose every domain value.

DB records use persistence primitives such as `string` rather than repeating business enums. Business-to-DB conversion can assign string enum values directly, while DB-to-business conversion uses a localized type assertion because this in-memory store and its seed data are fully controlled. This deliberately gives up runtime protection from invalid persisted enum-like strings; a real external database may require validation for legacy, corrupted, or manually modified data.

Business modules use namespace-qualified DB calls such as `db.listUsers()` so persistence operations remain explicit at each call site. API handlers use direct named business imports because their external operation calls are already unambiguously business-layer calls.

Prefer named intermediate values over nested calls or dense operation chains when several steps are involved. The additional lines make data access, conversion, and return values easier to follow and debug.

- The API layer owns HTTP handling, `X-User-Id` resolution, Zod request schemas, and HTTP response mapping.
- The business layer owns authorization, submission validation, state transitions, approval routing, and response composition.
- The DB layer owns the in-memory records, ID allocation, and atomic status-history insertion.

`api/src/app.ts` is the HTTP composition root that configures Express and mounts the API router. `api/src/index.ts` owns only process startup and listening. The API router declares paths, while API handlers convert between HTTP and business-layer models.

### User identity

The client sends the selected user in the `X-User-Id` header. API middleware validates that the header contains a non-empty string and passes the user ID to the handler through request-scoped `response.locals`. The handler passes that ID to the business operation, which resolves the user and performs authorization. Middleware does not call the business or DB layers. Actor, requester, status, approver, and history data are never trusted from editable request fields.

This models where real authentication middleware would provide a trusted current user, but the header itself is only a demo substitute for authentication.

### Expense request data

Retain the supplied seed-data shape by grouping editable fields inside a strongly typed `values` object. `ExpenseValues` defines every field and its type; it is not a dynamic key-value map.

The `values` boundary keeps all user-editable form data together so the API can strictly validate and replace it as one unit. Requester, status, approver, and history remain server-controlled outside that object. A future relational DB model may still map the typed value fields to ordinary columns rather than storing them as JSON.

Draft fields that have no value are represented explicitly as `null`. A draft `values` object includes all fields, while submission validation decides whether the current values are complete and valid. `billable` is a non-null boolean with a default of `false`.

Request data and status history are separate data structures. API detail and list responses are read models assembled by the business layer and include the latest status information without embedding the complete history.

Any known user may read the request list, details, and history. This keeps the internal approval queue visible to requesters and approvers, while create and update operations enforce actor-specific rules. Only the requester can replace a Draft's values.

Treat the supplied seed files as source material rather than a runtime data contract. Copy the sample records into project-owned seed files that already match the in-memory DB models. Users, expense requests, and status-history entries are therefore loaded directly from separate record lists. Startup does not parse nested request events or convert the interview fixture format, because that conversion would add code without exercising the workflow business rules.

The in-memory request ID counter starts from the number of seeded requests. This deliberately assumes the project-owned seed IDs are contiguous, avoiding production-grade ID allocation logic in a DB substitute. A real database would own ID generation.

The request detail response includes at least:

- The typed expense request `values`.
- The current status.
- The latest status sequence.
- The currently assigned approver when applicable.

The full status history is retrieved from a separate endpoint. No endpoint requires pagination for this assignment.

The request API surface is:

```text
GET  /api/requests
POST /api/requests
GET  /api/requests/:id
PUT  /api/requests/:id
POST /api/requests/:id/status
GET  /api/requests/:id/history
```

All request endpoints require `X-User-Id`. Zod schemas are strict, so attempts to include protected root fields such as requester or status are rejected rather than silently stripped.

### Status history and concurrency

Status history is append-only. Each record contains the request ID, sequence, action, new status, actor, and timestamp. A submit or resubmit record also contains the server-selected approver so the assignment remains part of the workflow history.

The in-memory history array is maintained in sequence order, so the last matching entry is the current status. A SQL implementation would make the ordering explicit with `ORDER BY sequence DESC LIMIT 1`.

Creating a request and appending its initial `CREATE` status are separate DB operations called by one business operation. This keeps request persistence separate from the reusable, sequence-checked history append. A real database implementation should execute both calls within one transaction so a failed initial history insert cannot leave an orphan request.

A business `StatusHistoryEntry` contains the complete candidate history entry, including the request ID and next sequence. The business conversion layer maps it to one primitive DB `StatusHistoryRecord`. The DB append operation verifies that the request exists and that the supplied sequence immediately follows the stored sequence before inserting it.

The sequence is unique and monotonically increasing within a request. A status command contains the sequence observed by the client. The business operation performs an early optimistic check for a useful error, while the DB layer performs the decisive compare-and-insert when appending the new status.

In a SQL implementation, inserting `expectedStatusSequence + 1` with a unique constraint on `(requestId, sequence)` provides the final concurrency check. A conflicting insert becomes an HTTP `409 Conflict`. The in-memory DB method mirrors that operation synchronously.

Draft updates also provide the expected status sequence. This prevents an update from succeeding after a concurrent status transition. Two concurrent updates while the request remains Draft use last-write-wins semantics. That is accepted because only the requester may edit the draft.

### Draft validation and replacement

Use `PUT /api/requests/:id` to replace the complete `values` object. All editable fields are resubmitted, shape-validated, and stored together. Omitted fields are not retained accidentally; nullable fields explicitly use `null` when absent.

API shape validation always applies. Submission business rules apply only when the user attempts to submit. An incomplete or business-invalid Draft can therefore be saved. The UI shows known submission problems as warnings, while a failed submit response returns field-specific errors.

The status workflow includes server-side submission validation because a `SUBMIT` operation cannot safely precede those rules. Missing base fields, negative amounts, missing required conditional values, and values supplied when their condition does not apply produce `422 Unprocessable Entity` with field-specific errors. The Draft form displays those server errors beside their fields after a failed submit.

Only Draft requests can be edited. Editing request data and changing status are separate operations.

The Draft form exposes the base expense type, amount, description, and billable fields. It conditionally shows a client dropdown for billable expenses, extra justification for amounts of at least $1,000, and an Other reason for the Other expense type. Its warning list covers the same submission rules without preventing an incomplete Draft from being saved. A Draft always uses the form view, but its native form controls are disabled when the selected user is not the requester. Conditional values are sent as `null` when their controlling condition no longer applies, preventing stale hidden values from being retained.

The form uses a simple interaction-based dirty flag rather than comparing complete values. Save Draft is disabled until a field changes, while Submit is disabled until those changes are saved. Returning a field to its original value still leaves the form dirty and requires an explicit save.

Client is a small enum owned by the business layer, with `Acme`, `Globex`, and `Initech` as its current values. The API imports that enum for request validation, while the UI mirrors the public API values for its dropdown and runtime response checks.

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
REOPEN:   Rejected  -> Draft
```

`WITHDRAW` lets the requester correct a submitted request before it is decided. The withdrawal is visible in history, removes the current approval assignment, and prevents the previous approver from acting. Resubmission validates the request again and recomputes the approver.

The rejected-request extension adds an owner-only `REOPEN` action from Rejected to Draft, after which the existing update and submit operations are reused. Resubmission revalidates the current values, recomputes the approver, and records another `SUBMIT` history entry.

### Approval routing

Keep approval selection in one business-layer function. It receives the requester, amount, and users, and returns the selected approver or a clear routing error. Submit and later resubmit use the same function. Neither the API handler nor the client selects the authoritative approver.

Expenses below $1,000 route to the requester's manager. Missing and self-referencing managers fall back to finance. Expenses of $1,000 or more route directly to finance. Submission fails clearly when the selected finance approver would be the requester or no finance approver exists.

## Changes from the initial proposal

- The initial root-level npm project was split into independent `api` and `ui` projects so their dependencies, commands, and build artifacts have explicit ownership.
- Zod was initially questioned as unnecessary for the business-rule complexity. It was retained after clarifying that its purpose is runtime API-boundary validation, which TypeScript types alone cannot provide.
- Zod response schemas were removed after noting that outgoing objects are constructed by typed server code and were never parsed at runtime. Ordinary API response interfaces provide the compile-time checks, while the browser still validates the JSON it receives.
- Automated tests with Vitest and Supertest were removed from the initial scope. Manual verification will be documented instead.
- Status history was separated from expense request records and from the expense request history endpoint.
- The supplied seed records are normalized once into project-owned DB-shaped seed files instead of adding runtime conversion logic for the interview fixture format.
- Layer models and conversions were moved out of handlers and business-operation modules into dedicated `models.ts` and `convert.ts` files. DB records were reduced to storage types, while business models became the source of truth for domain enums reused by API validation.
- User middleware was narrowed from resolving a business user to validating and forwarding only the `X-User-Id` value. Business operations own user lookup and authorization, keeping middleware within the HTTP layer.
- The temporary health endpoint and UI status display were removed after the users endpoint provided a real end-to-end API call. The static in-memory health response had served its scaffolding purpose and no longer represented meaningful application behavior.
- Flat request fields were considered because they map directly to relational columns. The strongly typed nested `values` shape was retained because it matches the supplied data and creates a clear validation and full-replacement boundary without requiring JSON persistence.
- Partial `PATCH` updates were replaced by full `PUT` replacement so every editable field is resubmitted and shape-validated.
- Per-operation workflow endpoints were replaced by one status endpoint with an enum-backed action, making later operations additive without adding routes.
- The initial proposal made Submitted requests unable to return to Draft. This was revised to allow an explicit owner-only `WITHDRAW` transition, keeping edits restricted to Draft while making withdrawal visible to the approver and in history.
- Status sequence concurrency protects transitions and edit-versus-transition races. Concurrent Draft edits intentionally remain last-write-wins rather than adding a separate request revision.
- The rejected-request flow was deliberately implemented as the final separate feature iteration so the core workflow remained reviewable on its own.
- The separate business `ExpenseRequestDetails` model was removed because every current request operation returns the latest status fields. One complete business `ExpenseRequest` is used until endpoints require genuinely different shapes.
- Server submission validation was pulled into the workflow iteration because accepting `SUBMIT` before enforcing the assignment rules would expose an invalid API state. The following UI iteration added the conditional inputs, matching Draft warnings, and inline field-error presentation.
- Time estimates and timebox-driven cuts are not used to guide implementation scope.

## Implementation order

1. Establish the TypeScript, Node.js, React, Vite, and Zod project foundation.
2. Build the three backend layers, seed data, and `X-User-Id` handling.
3. Wire a required-fields Draft slice through create, list, detail, full update, separate history retrieval, and the history UI.
4. Add the core status workflow, optimistic sequence checks, authorization, and approval routing.
5. Add conditional fields, complete the Draft warnings, and present server field errors inline.
6. Complete the documented manual verification.
7. Add the rejected-request reopen, edit, and resubmit flow.
8. Complete run instructions, tradeoffs, verification results, and AI-use documentation.

## Verification performed

The independent API and UI projects were manually verified on 2026-09-28:

- `npm install` completed independently in `api` and `ui`, producing a lockfile for each project.
- `npm run typecheck` completed successfully in both projects.
- `npm run build` produced `api/dist` and `ui/dist`.
- `npm run dev` started each development server from its own project directory.
- `GET /api/users` returned the project-owned seed users directly from the API and through Vite's `/api` development proxy.
- `npm start` ran the compiled API from `api`.
- Protected request endpoints returned `401` for missing and unknown user IDs.
- Request history returned the separate ordered status records.
- Creating a Draft with missing and negative submission values returned `201` and preserved those values.
- Replacing the complete values of an owner-controlled Draft returned `200`.
- Updating another user's Draft returned `403`.
- Updating a Submitted request or using a stale status sequence returned `409`.
- Supplying a protected `requesterId` in a create body returned `400` because the Zod schema is strict.
- npm reported no known vulnerabilities in either project after installation.

The status workflow was manually verified on 2026-09-29:

- Strict API validation rejected `CREATE` as a public status command with `400`.
- An incomplete billable Draft failed submission with `422` and errors for every invalid field.
- A valid low-value request routed to the requester's manager and submitted with sequence 2.
- A non-assigned user could not approve the submitted request and received `403`.
- A stale expected status sequence produced `409`.
- The assigned manager approved the request, producing sequence 3 and clearing the assignment.
- Compiled in-process checks covered owner withdrawal, assigned-approver rejection, high-value finance routing, finance self-approval refusal, and the same authorization and concurrency guards.

The conditional form and API contract were verified on 2026-09-30:

- Root-level `npm run typecheck` and `npm run build` completed successfully for both projects.
- API shape validation rejected a client outside the configured dropdown values with `400` and a field-specific error.
- An incomplete conditional Draft retained its missing extra justification and Other reason, then submission returned both field errors with `422`.
- A Draft containing client, extra-justification, and Other-reason values outside their applicable conditions was saved, then submission returned all three inverse field errors with `422`.
- Replacing the Draft with complete conditional values succeeded, and submitting its high-value amount routed it to finance.

The rejected-request extension was manually verified on 2026-09-30:

- The assigned manager rejected a submitted request, producing a Rejected request with no active approver.
- A non-owner received `403` when attempting to reopen it, while the requester reopened it to Draft with the next status sequence.
- The requester edited the reopened Draft and resubmitted it. Submission validation ran again, the changed high-value amount routed to finance, and history contained `REJECT`, `REOPEN`, and the new `SUBMIT` in sequence order.
- Attempting to reopen an Approved request returned `409` because REOPEN is valid only from Rejected.

No automated tests have been added or run.
