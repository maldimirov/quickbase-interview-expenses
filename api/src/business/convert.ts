import type {
  ExpenseRequestRecord,
  ExpenseValuesRecord,
  StatusHistoryRecord,
  UserRecord,
} from "../db/models.js";
import {
  Client,
  ExpenseType,
  RequestAction,
  RequestStatus,
  UserRole,
  type ExpenseRequest,
  type ExpenseValues,
  type StatusHistoryEntry,
  type User,
} from "./models.js";

// DB records deliberately use storage primitives. Restore their controlled
// string values to domain enums before business rules consume them.
export function toUser(userRecord: UserRecord): User {
  return {
    id: userRecord.id,
    name: userRecord.name,
    role: userRecord.role as UserRole,
    managerId: userRecord.managerId,
  };
}

export function toExpenseRequest(
  expenseRequestRecord: ExpenseRequestRecord,
  latestStatusRecord: StatusHistoryRecord,
): ExpenseRequest {
  return {
    id: expenseRequestRecord.id,
    requesterId: expenseRequestRecord.requesterId,
    values: {
      expenseType: expenseRequestRecord.values.expenseType as ExpenseType | null,
      amountCents: expenseRequestRecord.values.amountCents,
      description: expenseRequestRecord.values.description,
      billable: expenseRequestRecord.values.billable,
      client: expenseRequestRecord.values.client as Client | null,
      additionalJustification:
        expenseRequestRecord.values.additionalJustification,
      otherReason: expenseRequestRecord.values.otherReason,
    },
    status: latestStatusRecord.newStatus as RequestStatus,
    statusSequence: latestStatusRecord.sequence,
    assignedApproverId: latestStatusRecord.assignedApproverId,
  };
}

export function toStatusHistoryEntry(
  statusHistoryRecord: StatusHistoryRecord,
): StatusHistoryEntry {
  return {
    requestId: statusHistoryRecord.requestId,
    sequence: statusHistoryRecord.sequence,
    action: statusHistoryRecord.action as RequestAction,
    newStatus: statusHistoryRecord.newStatus as RequestStatus,
    actorId: statusHistoryRecord.actorId,
    occurredAt: statusHistoryRecord.occurredAt,
    assignedApproverId: statusHistoryRecord.assignedApproverId,
  };
}

export function toExpenseValuesRecord(
  expenseValues: ExpenseValues,
): ExpenseValuesRecord {
  return {
    expenseType: expenseValues.expenseType,
    amountCents: expenseValues.amountCents,
    description: expenseValues.description,
    billable: expenseValues.billable,
    client: expenseValues.client,
    additionalJustification: expenseValues.additionalJustification,
    otherReason: expenseValues.otherReason,
  };
}

export function toStatusHistoryRecord(
  statusHistoryEntry: StatusHistoryEntry,
): StatusHistoryRecord {
  return {
    requestId: statusHistoryEntry.requestId,
    sequence: statusHistoryEntry.sequence,
    action: statusHistoryEntry.action,
    newStatus: statusHistoryEntry.newStatus,
    actorId: statusHistoryEntry.actorId,
    occurredAt: statusHistoryEntry.occurredAt,
    assignedApproverId: statusHistoryEntry.assignedApproverId,
  };
}
