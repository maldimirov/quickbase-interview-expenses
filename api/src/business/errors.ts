export enum BusinessErrorCode {
  UnknownUser = "UNKNOWN_USER",
  ExpenseRequestNotFound = "EXPENSE_REQUEST_NOT_FOUND",
  ExpenseRequestForbidden = "EXPENSE_REQUEST_FORBIDDEN",
  ExpenseRequestNotEditable = "EXPENSE_REQUEST_NOT_EDITABLE",
  ExpenseRequestInvalid = "EXPENSE_REQUEST_INVALID",
  StatusTransitionInvalid = "STATUS_TRANSITION_INVALID",
  StatusSequenceConflict = "STATUS_SEQUENCE_CONFLICT",
  ApproverUnavailable = "APPROVER_UNAVAILABLE",
}

export class BusinessError extends Error {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}
