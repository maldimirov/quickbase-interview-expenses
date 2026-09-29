import * as db from "../db/requests.js";
import {
  toExpenseRequest,
  toExpenseValuesRecord,
  toStatusHistoryEntry,
  toStatusHistoryRecord,
} from "./convert.js";
import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  RequestAction,
  RequestStatus,
  type ExpenseRequest,
  type ExpenseValues,
  type StatusHistoryEntry,
} from "./models.js";
import { readUser } from "./users.js";

const FIRST_STATUS_SEQUENCE = 1;

export function listExpenseRequests(userId: string): ExpenseRequest[] {
  ensureKnownUser(userId);

  const expenseRequestRecords = db.listExpenseRequests();

  return expenseRequestRecords.map((expenseRequestRecord) => {
    const latestStatus = readLatestStatus(expenseRequestRecord.id);
    const expenseRequest = toExpenseRequest(
      expenseRequestRecord,
      latestStatus,
    );

    return expenseRequest;
  });
}

export function getExpenseRequest(
  userId: string,
  requestId: string,
): ExpenseRequest {
  ensureKnownUser(userId);

  const expenseRequest = readExpenseRequest(requestId);

  return expenseRequest;
}

export function getStatusHistory(
  userId: string,
  requestId: string,
): StatusHistoryEntry[] {
  ensureKnownUser(userId);
  readExpenseRequestRecord(requestId);

  const statusHistoryRecords = db.listStatusHistory(requestId);
  const statusHistory = statusHistoryRecords.map(toStatusHistoryEntry);

  return statusHistory;
}

export function createExpenseRequest(
  userId: string,
  values: ExpenseValues,
): ExpenseRequest {
  ensureKnownUser(userId);

  const expenseValuesRecord = toExpenseValuesRecord(values);
  const expenseRequestRecord = db.createExpenseRequest({
    requesterId: userId,
    values: expenseValuesRecord,
  });
  const initialStatus: StatusHistoryEntry = {
    requestId: expenseRequestRecord.id,
    sequence: FIRST_STATUS_SEQUENCE,
    action: RequestAction.Create,
    newStatus: RequestStatus.Draft,
    actorId: userId,
    occurredAt: new Date().toISOString(),
    assignedApproverId: null,
  };
  const initialStatusRecord = toStatusHistoryRecord(initialStatus);
  const appendedStatusRecord = db.appendStatusHistory(initialStatusRecord);

  if (appendedStatusRecord === undefined) {
    throw new Error(
      `Could not create initial status for ${expenseRequestRecord.id}`,
    );
  }

  const expenseRequest = toExpenseRequest(
    expenseRequestRecord,
    appendedStatusRecord,
  );

  return expenseRequest;
}

export function updateExpenseRequest(
  userId: string,
  requestId: string,
  expectedStatusSequence: number,
  values: ExpenseValues,
): ExpenseRequest {
  ensureKnownUser(userId);

  const expenseRequestRecord = readExpenseRequestRecord(requestId);
  const latestStatus = readLatestStatus(requestId);

  if (expenseRequestRecord.requesterId !== userId) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestForbidden,
      "Only the requester can edit this expense request",
    );
  }

  if (latestStatus.newStatus !== RequestStatus.Draft) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestNotEditable,
      "Only Draft expense requests can be edited",
    );
  }

  if (latestStatus.sequence !== expectedStatusSequence) {
    throwStatusSequenceConflict();
  }

  const expenseValuesRecord = toExpenseValuesRecord(values);
  const updatedExpenseRequest = db.replaceExpenseRequestValues(
    requestId,
    expectedStatusSequence,
    expenseValuesRecord,
  );

  if (updatedExpenseRequest === undefined) {
    throwStatusSequenceConflict();
  }

  const expenseRequest = toExpenseRequest(
    updatedExpenseRequest,
    latestStatus,
  );

  return expenseRequest;
}

function ensureKnownUser(userId: string): void {
  if (readUser(userId) === undefined) {
    throw new BusinessError(
      BusinessErrorCode.UnknownUser,
      "The current user does not exist",
    );
  }
}

function readExpenseRequest(requestId: string): ExpenseRequest {
  const expenseRequestRecord = readExpenseRequestRecord(requestId);
  const latestStatus = readLatestStatus(requestId);
  const expenseRequest = toExpenseRequest(
    expenseRequestRecord,
    latestStatus,
  );

  return expenseRequest;
}

function readExpenseRequestRecord(requestId: string) {
  const expenseRequest = db.readExpenseRequest(requestId);

  if (expenseRequest === undefined) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestNotFound,
      "Expense request not found",
    );
  }

  return expenseRequest;
}

function readLatestStatus(requestId: string) {
  const latestStatus = db.readLatestStatusHistory(requestId);

  if (latestStatus === undefined) {
    throw new Error(`Expense request ${requestId} has no status history`);
  }

  return latestStatus;
}

function throwStatusSequenceConflict(): never {
  throw new BusinessError(
    BusinessErrorCode.StatusSequenceConflict,
    "The expense request status changed; reload it and try again",
  );
}
