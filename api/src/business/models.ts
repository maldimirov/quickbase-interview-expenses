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

export interface StatusHistoryEntry {
  requestId: string;
  sequence: number;
  action: RequestAction;
  newStatus: RequestStatus;
  actorId: string;
  occurredAt: string;
  assignedApproverId: string | null;
}
