const API_ROOT = "/api";
const USER_ID_HEADER = "X-User-Id";

export enum UserRole {
  Employee = "employee",
  Manager = "manager",
  Finance = "finance",
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  managerId: string | null;
}

interface ApiRequestOptions extends RequestInit {
  currentUserId?: string;
}

export async function listUsers(signal: AbortSignal): Promise<User[]> {
  const body = await requestJson("/users", { signal });

  if (!Array.isArray(body) || !body.every(isUser)) {
    throw new Error("API returned an invalid users response");
  }

  return body;
}

async function requestJson(
  path: string,
  { currentUserId, headers: providedHeaders, ...requestOptions }: ApiRequestOptions,
): Promise<unknown> {
  const headers = new Headers(providedHeaders);

  if (currentUserId !== undefined) {
    headers.set(USER_ID_HEADER, currentUserId);
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    ...requestOptions,
    headers,
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return body;
}

function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isUserRole(value.role) &&
    (typeof value.managerId === "string" || value.managerId === null)
  );
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === UserRole.Employee ||
    value === UserRole.Manager ||
    value === UserRole.Finance
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
