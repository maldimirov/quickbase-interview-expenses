import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  RequestAction,
  RequestStatus,
  type ExpenseRequest,
} from "./models.js";

// Derive the next status only after checking both the current server-owned state
// and the actor. This keeps transition and authorization rules in one decision.
export function validateAction(
  action: RequestAction,
  actorId: string,
  expenseRequest: ExpenseRequest,
): RequestStatus {
  switch (action) {
    case RequestAction.Submit:
      ensureStatus(expenseRequest, RequestStatus.Draft, action);
      ensureRequester(expenseRequest, actorId, action);
      return RequestStatus.Submitted;
    case RequestAction.Withdraw:
      ensureStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureRequester(expenseRequest, actorId, action);
      return RequestStatus.Draft;
    case RequestAction.Approve:
      ensureStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureApprover(expenseRequest, actorId, action);
      return RequestStatus.Approved;
    case RequestAction.Reject:
      ensureStatus(expenseRequest, RequestStatus.Submitted, action);
      ensureApprover(expenseRequest, actorId, action);
      return RequestStatus.Rejected;
    case RequestAction.Reopen:
      ensureStatus(expenseRequest, RequestStatus.Rejected, action);
      ensureRequester(expenseRequest, actorId, action);
      return RequestStatus.Draft;
    default:
      throw new BusinessError(
        BusinessErrorCode.StatusTransitionInvalid,
        `${action} is not an available status operation`,
      );
  }
}

function ensureStatus(
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

function ensureApprover(
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
