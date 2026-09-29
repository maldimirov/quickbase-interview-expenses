import { useEffect, useMemo, useState } from "react";

import {
  createExpenseRequest,
  ExpenseType,
  getExpenseRequest,
  listExpenseRequests,
  listStatusHistory,
  listUsers,
  RequestStatus,
  updateExpenseRequest,
  type ExpenseRequest,
  type ExpenseValues,
  type StatusHistoryEntry,
  type User,
} from "./api";
import { ExpenseForm } from "./ExpenseForm";

const EMPTY_EXPENSE_VALUES: ExpenseValues = {
  expenseType: null,
  amountCents: null,
  description: null,
  billable: false,
  client: null,
  additionalJustification: null,
  otherReason: null,
};

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(
    null,
  );
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const usersById = useMemo(
    () => {
      const userEntries = users.map((user) => [user.id, user] as const);

      return new Map(userEntries);
    },
    [users],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      try {
        const availableUsers = await listUsers(controller.signal);

        setUsers(availableUsers);
        setCurrentUserId(availableUsers[0]?.id ?? null);
      } catch (error) {
        if (!isAbortError(error)) {
          setPageError(getErrorMessage(error, "Users could not be loaded"));
        }
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (currentUserId === null) {
      setRequests([]);
      setSelectedRequestId(null);
      return;
    }

    const controller = new AbortController();
    const userId = currentUserId;

    async function loadRequests() {
      setIsLoadingRequests(true);
      setPageError(null);

      try {
        const availableRequests = await listExpenseRequests(
          userId,
          controller.signal,
        );

        setRequests(availableRequests);
        setSelectedRequestId((currentRequestId) => {
          const currentRequestStillExists = availableRequests.some(
            ({ id }) => id === currentRequestId,
          );

          if (currentRequestId !== null && currentRequestStillExists) {
            return currentRequestId;
          }

          return availableRequests[0]?.id ?? null;
        });
      } catch (error) {
        if (!isAbortError(error)) {
          setPageError(getErrorMessage(error, "Requests could not be loaded"));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRequests(false);
        }
      }
    }

    void loadRequests();

    return () => controller.abort();
  }, [currentUserId]);

  useEffect(() => {
    if (
      currentUserId === null ||
      selectedRequestId === null ||
      isCreating
    ) {
      setSelectedRequest(null);
      setHistory([]);
      return;
    }

    const controller = new AbortController();
    const userId = currentUserId;
    const requestId = selectedRequestId;

    async function loadRequestDetails() {
      setPageError(null);

      try {
        const [expenseRequest, statusHistory] = await Promise.all([
          getExpenseRequest(
            userId,
            requestId,
            controller.signal,
          ),
          listStatusHistory(
            userId,
            requestId,
            controller.signal,
          ),
        ]);

        setSelectedRequest(expenseRequest);
        setHistory(statusHistory);
      } catch (error) {
        if (!isAbortError(error)) {
          setPageError(getErrorMessage(error, "Request details could not be loaded"));
        }
      }
    }

    void loadRequestDetails();

    return () => controller.abort();
  }, [currentUserId, isCreating, selectedRequestId]);

  function handleCurrentUserChange(userId: string) {
    setCurrentUserId(userId);
    setSelectedRequestId(null);
    setSelectedRequest(null);
    setHistory([]);
    setIsCreating(false);
  }

  function handleSelectRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setIsCreating(false);
  }

  async function handleCreate(values: ExpenseValues) {
    if (currentUserId === null) {
      return;
    }

    const createdRequest = await createExpenseRequest(currentUserId, values);

    setRequests((currentRequests) => [...currentRequests, createdRequest]);
    setIsCreating(false);
    setSelectedRequestId(createdRequest.id);
  }

  async function handleUpdate(values: ExpenseValues) {
    if (currentUserId === null || selectedRequest === null) {
      return;
    }

    const updatedRequest = await updateExpenseRequest(
      currentUserId,
      selectedRequest.id,
      selectedRequest.statusSequence,
      values,
    );

    setSelectedRequest(updatedRequest);
    setRequests((currentRequests) =>
      currentRequests.map((expenseRequest) => {
        if (expenseRequest.id === updatedRequest.id) {
          return updatedRequest;
        }

        return expenseRequest;
      }),
    );
  }

  const currentUserIsRequester =
    selectedRequest !== null &&
    selectedRequest.requesterId === currentUserId;
  const selectedRequestIsDraft =
    selectedRequest !== null &&
    selectedRequest.status === RequestStatus.Draft;

  return (
    <main className="app-shell">
      <header className="topbar card">
        <div>
          <p className="eyebrow">Quickbase interview demo</p>
          <h1>Expense Requests</h1>
        </div>
        <div className="user-picker">
          <label htmlFor="current-user">Acting as</label>
          <select
            id="current-user"
            value={currentUserId ?? ""}
            disabled={users.length === 0}
            onChange={(event) => handleCurrentUserChange(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </select>
        </div>
      </header>

      {pageError !== null && <div className="page-error">{pageError}</div>}

      <div className="workspace">
        <aside className="request-panel card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">All requests</p>
              <h2>Requests</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              disabled={currentUserId === null}
              onClick={() => {
                setIsCreating(true);
                setSelectedRequestId(null);
              }}
            >
              New request
            </button>
          </div>

          {isLoadingRequests && <p className="muted">Loading requests…</p>}
          {!isLoadingRequests && requests.length === 0 && (
            <p className="muted">No requests yet.</p>
          )}

          <div className="request-list">
            {requests.map((expenseRequest) => (
              <button
                className={`request-list-item${
                  expenseRequest.id === selectedRequestId ? " is-selected" : ""
                }`}
                key={expenseRequest.id}
                type="button"
                onClick={() => handleSelectRequest(expenseRequest.id)}
              >
                <span>
                  <strong>{expenseRequest.id}</strong>
                  <small>
                    {expenseRequest.values.description ?? "Incomplete Draft"}
                  </small>
                </span>
                <span className={`status status--${expenseRequest.status.toLowerCase()}`}>
                  {expenseRequest.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel card">
          {isCreating && currentUserId !== null && (
            <>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">New Draft</p>
                  <h2>Create request</h2>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </div>
              <ExpenseForm
                key="new-request"
                initialValues={EMPTY_EXPENSE_VALUES}
                submitLabel="Save Draft"
                onSubmit={handleCreate}
              />
            </>
          )}

          {!isCreating && selectedRequest === null && (
            <div className="empty-state">
              <h2>Select a request</h2>
              <p>Choose an existing request or create a new Draft.</p>
            </div>
          )}

          {!isCreating && selectedRequest !== null && (
            <>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{selectedRequest.status}</p>
                  <h2>{selectedRequest.id}</h2>
                  <p className="muted">
                    Requested by {getUserName(usersById, selectedRequest.requesterId)}
                  </p>
                </div>
                <span className="sequence">
                  Status version {selectedRequest.statusSequence}
                </span>
              </div>

              {selectedRequestIsDraft ? (
                <>
                  {!currentUserIsRequester && (
                    <p className="muted">
                      Only the requester can edit this Draft.
                    </p>
                  )}
                  <ExpenseForm
                    key={selectedRequest.id}
                    initialValues={selectedRequest.values}
                    submitLabel="Save Draft"
                    disabled={!currentUserIsRequester}
                    onSubmit={handleUpdate}
                  />
                </>
              ) : (
                <ExpenseValuesView values={selectedRequest.values} />
              )}

              <section className="history">
                <h3>History</h3>
                {history.map((event) => (
                  <article className="history-event" key={event.sequence}>
                    <span className="history-marker" aria-hidden="true" />
                    <div>
                      <strong>{event.action}</strong>
                      <p>
                        {getUserName(usersById, event.actorId)} ·{" "}
                        {new Date(event.occurredAt).toLocaleString()}
                      </p>
                      <small>New status: {event.newStatus}</small>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function ExpenseValuesView({ values }: { values: ExpenseValues }) {
  return (
    <dl className="values-grid">
      <div>
        <dt>Expense type</dt>
        <dd>{values.expenseType ?? "Not set"}</dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd>{formatMoney(values.amountCents)}</dd>
      </div>
      <div className="values-grid__wide">
        <dt>Description</dt>
        <dd>{values.description ?? "Not set"}</dd>
      </div>
      <div>
        <dt>Billable</dt>
        <dd>{values.billable ? "Yes" : "No"}</dd>
      </div>
      {values.client !== null && (
        <div>
          <dt>Client</dt>
          <dd>{values.client}</dd>
        </div>
      )}
      {values.additionalJustification !== null && (
        <div className="values-grid__wide">
          <dt>Extra justification</dt>
          <dd>{values.additionalJustification}</dd>
        </div>
      )}
      {values.expenseType === ExpenseType.Other && (
        <div className="values-grid__wide">
          <dt>Other reason</dt>
          <dd>{values.otherReason ?? "Not set"}</dd>
        </div>
      )}
    </dl>
  );
}

function formatMoney(amountCents: number | null): string {
  if (amountCents === null) {
    return "Not set";
  }

  const sign = amountCents < 0 ? "-" : "";
  const absoluteAmount = Math.abs(amountCents);
  const wholePart = Math.floor(absoluteAmount / 100);
  const decimalPart = String(absoluteAmount % 100).padStart(2, "0");

  return `${sign}$${wholePart}.${decimalPart}`;
}

function getUserName(usersById: Map<string, User>, userId: string): string {
  return usersById.get(userId)?.name ?? userId;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
