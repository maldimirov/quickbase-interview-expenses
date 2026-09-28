export interface UserRecord {
  id: string;
  name: string;
  role: string;
  managerId: string | null;
}

export interface ExpenseValuesRecord {
  expenseType: string | null;
  amountCents: number | null;
  description: string | null;
  billable: boolean;
  client: string | null;
  additionalJustification: string | null;
  otherReason: string | null;
}

export interface ExpenseRequestRecord {
  id: string;
  requesterId: string;
  values: ExpenseValuesRecord;
}

export interface StatusHistoryRecord {
  requestId: string;
  sequence: number;
  action: string;
  newStatus: string;
  actorId: string;
  occurredAt: string;
  assignedApproverId: string | null;
}
