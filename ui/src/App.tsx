import { useEffect, useState } from "react";

import { listUsers, type User } from "./api";

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      try {
        const availableUsers = await listUsers(controller.signal);

        setUsers(availableUsers);
        setCurrentUserId(
          (selectedUserId) => selectedUserId ?? availableUsers[0]?.id ?? null,
        );
        setUsersError(null);
      } catch (error) {
        if (!isAbortError(error)) {
          setUsersError("Users could not be loaded");
        }
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, []);

  return (
    <main>
      <section className="card">
        <p className="eyebrow">Quickbase interview demo</p>
        <h1>Expense Requests</h1>
        <p>The project foundation is ready for the first expense-request workflow.</p>
        <div className="field">
          <label htmlFor="current-user">Acting as</label>
          <select
            id="current-user"
            value={currentUserId ?? ""}
            disabled={users.length === 0}
            onChange={(event) => setCurrentUserId(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </select>
          {currentUserId !== null && (
            <small>
              API requests will use <code>{currentUserId}</code> as the current user.
            </small>
          )}
          {usersError !== null && <small className="error">{usersError}</small>}
        </div>
      </section>
    </main>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
