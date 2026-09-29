import type {
  ExpenseRequest,
  StatusHistoryEntry,
  User,
} from "../business/models.js";
import type {
  ExpenseRequestResponse,
  StatusHistoryEntryResponse,
  UserResponse,
} from "./models.js";

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
  };
}

export function toExpenseRequestResponse(
  expenseRequest: ExpenseRequest,
): ExpenseRequestResponse {
  return {
    id: expenseRequest.id,
    requesterId: expenseRequest.requesterId,
    values: {
      expenseType: expenseRequest.values.expenseType,
      amountCents: expenseRequest.values.amountCents,
      description: expenseRequest.values.description,
      billable: expenseRequest.values.billable,
      client: expenseRequest.values.client,
      additionalJustification: expenseRequest.values.additionalJustification,
      otherReason: expenseRequest.values.otherReason,
    },
    status: expenseRequest.status,
    statusSequence: expenseRequest.statusSequence,
    assignedApproverId: expenseRequest.assignedApproverId,
  };
}

export function toStatusHistoryEntryResponse(
  statusHistoryEntry: StatusHistoryEntry,
): StatusHistoryEntryResponse {
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
