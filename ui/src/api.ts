const API_ROOT = "/api";
const USER_ID_HEADER = "X-User-Id";
const JSON_CONTENT_TYPE = "application/json";

export enum UserRole {
  Employee = "employee",
  Manager = "manager",
  Finance = "finance",
}

export enum ExpenseType {
  Travel = "Travel",
  Software = "Software",
  Equipment = "Equipment",
  Meal = "Meal",
  Other = "Other",
}

export const HIGH_VALUE_EXPENSE_CENTS = 100_000;

export enum Client {
  Acme = "Acme",
  Globex = "Globex",
  Initech = "Initech",
}

export enum RequestStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  Approved = "APPROVED",
  Rejected = "REJECTED",
}

export enum RequestAction {
  Create = "CREATE",
  Submit = "SUBMIT",
  Withdraw = "WITHDRAW",
  Approve = "APPROVE",
  Reject = "REJECT",
}

export type StatusCommandAction =
  | RequestAction.Submit
  | RequestAction.Withdraw
  | RequestAction.Approve
  | RequestAction.Reject;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  managerId: string | null;
}

export interface ExpenseValues {
  expenseType: ExpenseType | null;
  amountCents: number | null;
  description: string | null;
  billable: boolean;
  client: Client | null;
  additionalJustification: string | null;
  otherReason: string | null;
}

export interface ExpenseRequest {
  id: string;
  requesterId: string;
  values: ExpenseValues;
  status: RequestStatus;
  statusSequence: number;
  assignedApproverId: string | null;
}

export interface StatusHistoryEntry {
  requestId: string;
  sequence: number;
  action: RequestAction;
  newStatus: RequestStatus;
  actorId: string;
  occurredAt: string;
  assignedApproverId: string | null;
}

interface ApiRequestOptions extends RequestInit {
  currentUserId?: string;
}

export type FieldErrors = Record<string, string[]>;

interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Fetch returns untyped JSON at runtime. Validate every response before it can
// enter React state, even though the expected shapes are also TypeScript types.
export async function listUsers(signal: AbortSignal): Promise<User[]> {
  const body = await requestJson("/users", { signal });

  if (!Array.isArray(body) || !body.every(isUser)) {
    throw new Error("API returned an invalid users response");
  }

  return body;
}

export async function listExpenseRequests(
  currentUserId: string,
  signal?: AbortSignal,
): Promise<ExpenseRequest[]> {
  const body = await requestJson("/requests", { currentUserId, signal });

  if (!Array.isArray(body) || !body.every(isExpenseRequest)) {
    throw new Error("API returned an invalid expense-request list");
  }

  return body;
}

export async function getExpenseRequest(
  currentUserId: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<ExpenseRequest> {
  const body = await requestJson(`/requests/${encodeURIComponent(requestId)}`, {
    currentUserId,
    signal,
  });

  if (!isExpenseRequest(body)) {
    throw new Error("API returned an invalid expense request");
  }

  return body;
}

export async function listStatusHistory(
  currentUserId: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<StatusHistoryEntry[]> {
  const body = await requestJson(
    `/requests/${encodeURIComponent(requestId)}/history`,
    { currentUserId, signal },
  );

  if (!Array.isArray(body) || !body.every(isStatusHistoryEntry)) {
    throw new Error("API returned invalid status history");
  }

  return body;
}

export async function createExpenseRequest(
  currentUserId: string,
  values: ExpenseValues,
): Promise<ExpenseRequest> {
  const body = await requestJson("/requests", {
    method: "POST",
    currentUserId,
    body: JSON.stringify({ values }),
  });

  if (!isExpenseRequest(body)) {
    throw new Error("API returned an invalid created expense request");
  }

  return body;
}

export async function updateExpenseRequest(
  currentUserId: string,
  requestId: string,
  expectedStatusSequence: number,
  values: ExpenseValues,
): Promise<ExpenseRequest> {
  const body = await requestJson(`/requests/${encodeURIComponent(requestId)}`, {
    method: "PUT",
    currentUserId,
    body: JSON.stringify({ values, expectedStatusSequence }),
  });

  if (!isExpenseRequest(body)) {
    throw new Error("API returned an invalid updated expense request");
  }

  return body;
}

export async function changeExpenseRequestStatus(
  currentUserId: string,
  requestId: string,
  expectedStatusSequence: number,
  action: StatusCommandAction,
): Promise<ExpenseRequest> {
  const body = await requestJson(
    `/requests/${encodeURIComponent(requestId)}/status`,
    {
      method: "POST",
      currentUserId,
      body: JSON.stringify({ action, expectedStatusSequence }),
    },
  );

  if (!isExpenseRequest(body)) {
    throw new Error("API returned an invalid status update response");
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

  if (requestOptions.body !== undefined) {
    headers.set("Content-Type", JSON_CONTENT_TYPE);
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    ...requestOptions,
    headers,
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(
        response.status,
        body.code,
        body.message,
        body.fieldErrors,
      );
    }

    throw new Error(`API request failed with status ${response.status}`);
  }

  return body;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (responseText === "") {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new Error("API returned a non-JSON response");
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    (value.fieldErrors === undefined || isFieldErrors(value.fieldErrors))
  );
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) =>
        Array.isArray(messages) &&
        messages.every((message) => typeof message === "string"),
    )
  );
}

function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isUserRole(value.role) &&
    isNullableString(value.managerId)
  );
}

function isExpenseRequest(value: unknown): value is ExpenseRequest {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.requesterId === "string" &&
    isExpenseValues(value.values) &&
    isRequestStatus(value.status) &&
    Number.isInteger(value.statusSequence) &&
    isNullableString(value.assignedApproverId)
  );
}

function isExpenseValues(value: unknown): value is ExpenseValues {
  return (
    isRecord(value) &&
    (value.expenseType === null || isExpenseType(value.expenseType)) &&
    (value.amountCents === null || Number.isInteger(value.amountCents)) &&
    isNullableString(value.description) &&
    typeof value.billable === "boolean" &&
    (value.client === null || isClient(value.client)) &&
    isNullableString(value.additionalJustification) &&
    isNullableString(value.otherReason)
  );
}

function isStatusHistoryEntry(value: unknown): value is StatusHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    Number.isInteger(value.sequence) &&
    isRequestAction(value.action) &&
    isRequestStatus(value.newStatus) &&
    typeof value.actorId === "string" &&
    typeof value.occurredAt === "string" &&
    isNullableString(value.assignedApproverId)
  );
}

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

function isExpenseType(value: unknown): value is ExpenseType {
  return Object.values(ExpenseType).includes(value as ExpenseType);
}

function isClient(value: unknown): value is Client {
  return Object.values(Client).includes(value as Client);
}

function isRequestStatus(value: unknown): value is RequestStatus {
  return Object.values(RequestStatus).includes(value as RequestStatus);
}

function isRequestAction(value: unknown): value is RequestAction {
  return Object.values(RequestAction).includes(value as RequestAction);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
