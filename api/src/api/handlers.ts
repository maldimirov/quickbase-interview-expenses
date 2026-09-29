import type { Request, Response } from "express";

import {
  changeExpenseRequestStatus,
  createExpenseRequest,
  getExpenseRequest,
  getStatusHistory,
  listExpenseRequests,
  updateExpenseRequest,
} from "../business/requests.js";
import { listUsers } from "../business/users.js";
import {
  toExpenseRequestResponse,
  toStatusHistoryEntryResponse,
  toUserResponse,
} from "./convert.js";
import { parseRequestInput } from "./errors.js";
import {
  changeExpenseRequestStatusBodySchema,
  createExpenseRequestBodySchema,
  type ExpenseRequestResponse,
  requestParamsSchema,
  type StatusHistoryEntryResponse,
  updateExpenseRequestBodySchema,
  type UserIdLocals,
  type UserResponse,
} from "./models.js";

export function listUsersHandler(
  _request: Request,
  response: Response<UserResponse[]>,
): void {
  const users = listUsers();
  const userResponses = users.map(toUserResponse);

  response.status(200).json(userResponses);
}

export function listExpenseRequestsHandler(
  _request: Request,
  response: Response<ExpenseRequestResponse[], UserIdLocals>,
): void {
  const expenseRequests = listExpenseRequests(response.locals.userId);
  const expenseRequestResponses = expenseRequests.map(toExpenseRequestResponse);

  response.status(200).json(expenseRequestResponses);
}

export function getExpenseRequestHandler(
  request: Request,
  response: Response<ExpenseRequestResponse, UserIdLocals>,
): void {
  const { requestId } = parseRequestInput(requestParamsSchema, request.params);
  const expenseRequest = getExpenseRequest(response.locals.userId, requestId);
  const expenseRequestResponse = toExpenseRequestResponse(expenseRequest);

  response.status(200).json(expenseRequestResponse);
}

export function getStatusHistoryHandler(
  request: Request,
  response: Response<StatusHistoryEntryResponse[], UserIdLocals>,
): void {
  const { requestId } = parseRequestInput(requestParamsSchema, request.params);
  const statusHistory = getStatusHistory(response.locals.userId, requestId);
  const statusHistoryResponse = statusHistory.map(
    toStatusHistoryEntryResponse,
  );

  response.status(200).json(statusHistoryResponse);
}

export function createExpenseRequestHandler(
  request: Request,
  response: Response<ExpenseRequestResponse, UserIdLocals>,
): void {
  const body = parseRequestInput(createExpenseRequestBodySchema, request.body);
  const expenseRequest = createExpenseRequest(
    response.locals.userId,
    body.values,
  );
  const expenseRequestResponse = toExpenseRequestResponse(expenseRequest);

  response.status(201).json(expenseRequestResponse);
}

export function updateExpenseRequestHandler(
  request: Request,
  response: Response<ExpenseRequestResponse, UserIdLocals>,
): void {
  const { requestId } = parseRequestInput(requestParamsSchema, request.params);
  const body = parseRequestInput(updateExpenseRequestBodySchema, request.body);
  const expenseRequest = updateExpenseRequest(
    response.locals.userId,
    requestId,
    body.expectedStatusSequence,
    body.values,
  );
  const expenseRequestResponse = toExpenseRequestResponse(expenseRequest);

  response.status(200).json(expenseRequestResponse);
}

export function changeExpenseRequestStatusHandler(
  request: Request,
  response: Response<ExpenseRequestResponse, UserIdLocals>,
): void {
  const { requestId } = parseRequestInput(requestParamsSchema, request.params);
  const body = parseRequestInput(
    changeExpenseRequestStatusBodySchema,
    request.body,
  );
  const expenseRequest = changeExpenseRequestStatus(
    response.locals.userId,
    requestId,
    body.expectedStatusSequence,
    body.action,
  );
  const expenseRequestResponse = toExpenseRequestResponse(expenseRequest);

  response.status(200).json(expenseRequestResponse);
}
