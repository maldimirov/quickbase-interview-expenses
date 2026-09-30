import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { BusinessError, BusinessErrorCode } from "../business/errors.js";

export enum ApiErrorCode {
  MissingUserId = "MISSING_USER_ID",
  UnknownUserId = "UNKNOWN_USER_ID",
  InvalidRequest = "INVALID_REQUEST",
  ExpenseRequestNotFound = "EXPENSE_REQUEST_NOT_FOUND",
  ExpenseRequestForbidden = "EXPENSE_REQUEST_FORBIDDEN",
  ExpenseRequestNotEditable = "EXPENSE_REQUEST_NOT_EDITABLE",
  ExpenseRequestInvalid = "EXPENSE_REQUEST_INVALID",
  StatusTransitionInvalid = "STATUS_TRANSITION_INVALID",
  StatusSequenceConflict = "STATUS_SEQUENCE_CONFLICT",
  ApproverUnavailable = "APPROVER_UNAVAILABLE",
}

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export class RequestValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super("Request data is invalid");
    this.name = "RequestValidationError";
  }
}

export function parseRequestInput<T>(
  schema: ZodType<T>,
  input: unknown,
): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const fieldErrors: Record<string, string[]> = {};

  // Preserve complete paths such as values.amountCents so the client can attach
  // each API error to the corresponding nested form field.
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "request";
    const messages = fieldErrors[field] ?? [];

    messages.push(issue.message);
    fieldErrors[field] = messages;
  }

  throw new RequestValidationError(fieldErrors);
}

export function apiErrorHandler(
  error: unknown,
  _request: Request,
  response: Response<ApiErrorResponse>,
  next: NextFunction,
): void {
  if (error instanceof RequestValidationError) {
    response.status(400).json({
      code: ApiErrorCode.InvalidRequest,
      message: error.message,
      fieldErrors: error.fieldErrors,
    });
    return;
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({
      code: ApiErrorCode.InvalidRequest,
      message: "Request body must contain valid JSON",
    });
    return;
  }

  if (error instanceof BusinessError) {
    sendBusinessError(response, error);
    return;
  }

  // Unexpected failures are left to Express instead of being disguised as a
  // known client or business error.
  next(error);
}

function sendBusinessError(
  response: Response<ApiErrorResponse>,
  error: BusinessError,
): void {
  switch (error.code) {
    case BusinessErrorCode.UnknownUser:
      response.status(401).json({
        code: ApiErrorCode.UnknownUserId,
        message: error.message,
      });
      return;
    case BusinessErrorCode.ExpenseRequestNotFound:
      response.status(404).json({
        code: ApiErrorCode.ExpenseRequestNotFound,
        message: error.message,
      });
      return;
    case BusinessErrorCode.ExpenseRequestForbidden:
      response.status(403).json({
        code: ApiErrorCode.ExpenseRequestForbidden,
        message: error.message,
      });
      return;
    case BusinessErrorCode.ExpenseRequestNotEditable:
      response.status(409).json({
        code: ApiErrorCode.ExpenseRequestNotEditable,
        message: error.message,
      });
      return;
    case BusinessErrorCode.ExpenseRequestInvalid:
      response.status(422).json({
        code: ApiErrorCode.ExpenseRequestInvalid,
        message: error.message,
        fieldErrors: error.fieldErrors,
      });
      return;
    case BusinessErrorCode.StatusTransitionInvalid:
      response.status(409).json({
        code: ApiErrorCode.StatusTransitionInvalid,
        message: error.message,
      });
      return;
    case BusinessErrorCode.StatusSequenceConflict:
      response.status(409).json({
        code: ApiErrorCode.StatusSequenceConflict,
        message: error.message,
      });
      return;
    case BusinessErrorCode.ApproverUnavailable:
      response.status(422).json({
        code: ApiErrorCode.ApproverUnavailable,
        message: error.message,
      });
      return;
  }
}

function isMalformedJsonError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}
