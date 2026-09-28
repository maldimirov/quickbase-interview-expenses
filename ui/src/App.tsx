import { useEffect, useState } from "react";

enum ApiState {
  Checking = "checking",
  Connected = "connected",
  Unavailable = "unavailable",
}

const HEALTH_STATUS_OK = "ok";

interface HealthResponse {
  status: typeof HEALTH_STATUS_OK;
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "status" in value && value.status === HEALTH_STATUS_OK;
}

export function App() {
  const [apiState, setApiState] = useState<ApiState>(ApiState.Checking);

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        setApiState(
          response.ok && isHealthResponse(body)
            ? ApiState.Connected
            : ApiState.Unavailable,
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setApiState(ApiState.Unavailable);
        }
      }
    }

    void checkApi();

    return () => controller.abort();
  }, []);

  return (
    <main>
      <section className="card">
        <p className="eyebrow">Quickbase interview demo</p>
        <h1>Expense Requests</h1>
        <p>The project foundation is ready for the first expense-request workflow.</p>
        <p className={`status status--${apiState}`}>
          API status: <strong>{apiState}</strong>
        </p>
      </section>
    </main>
  );
}
