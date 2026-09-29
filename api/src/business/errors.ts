export enum BusinessErrorCode {
  UnknownUser = "UNKNOWN_USER",
  ExpenseRequestNotFound = "EXPENSE_REQUEST_NOT_FOUND",
  ExpenseRequestForbidden = "EXPENSE_REQUEST_FORBIDDEN",
  ExpenseRequestNotEditable = "EXPENSE_REQUEST_NOT_EDITABLE",
  StatusSequenceConflict = "STATUS_SEQUENCE_CONFLICT",
}

export class BusinessError extends Error {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}
