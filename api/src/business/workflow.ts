import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  RequestAction,
  RequestStatus,
  type ExpenseRequest,
} from "./models.js";

export function getNewStatusForAction(
  action: RequestAction,
  actorId: string,
  expenseRequest: ExpenseRequest,
): RequestStatus {
  switch (action) {
    case RequestAction.Submit:
      ensureCurrentStatus(expenseRequest, RequestStatus.Draft, action);
      ensureRequester(expenseRequest, actorId, action);
      return RequestStatus.Submitted;
    case RequestAction.Withdraw:
      ensureCurrentStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureRequester(expenseRequest, actorId, action);
      return RequestStatus.Draft;
    case RequestAction.Approve:
      ensureCurrentStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureAssignedApprover(expenseRequest, actorId, action);
      return RequestStatus.Approved;
    case RequestAction.Reject:
      ensureCurrentStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureAssignedApprover(expenseRequest, actorId, action);
      return RequestStatus.Rejected;
    default:
      throw new BusinessError(
        BusinessErrorCode.StatusTransitionInvalid,
        `${action} is not an available status operation`,
      );
  }
}

function ensureCurrentStatus(
  expenseRequest: ExpenseRequest,
  expectedStatus: RequestStatus,
  action: RequestAction,
): void {
  if (expenseRequest.status !== expectedStatus) {
    throw new BusinessError(
      BusinessErrorCode.StatusTransitionInvalid,
      `${action} is not allowed while the request is ${expenseRequest.status}`,
    );
  }
}

function ensureRequester(
  expenseRequest: ExpenseRequest,
  actorId: string,
  action: RequestAction,
): void {
  if (expenseRequest.requesterId !== actorId) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestForbidden,
      `Only the requester can ${action.toLowerCase()} this expense request`,
    );
  }
}

function ensureAssignedApprover(
  expenseRequest: ExpenseRequest,
  actorId: string,
  action: RequestAction,
): void {
  if (expenseRequest.assignedApproverId !== actorId) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestForbidden,
      `Only the assigned approver can ${action.toLowerCase()} this expense request`,
    );
  }
}
