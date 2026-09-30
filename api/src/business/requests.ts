import * as db from "../db/requests.js";
import { selectApprover } from "./approval.js";
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
  type User,
} from "./models.js";
import { listUsers, readUser } from "./users.js";
import { validateExpenseForSubmission } from "./validation.js";
import { validateAction } from "./workflow.js";

const FIRST_STATUS_SEQUENCE = 1;
const STATUS_SEQUENCE_INCREMENT = 1;

export function listExpenseRequests(userId: string): ExpenseRequest[] {
  readKnownUser(userId);

  const expenseRequestRecords = db.listExpenseRequests();

  return expenseRequestRecords.map((expenseRequestRecord) => {
    // Current status is derived from append-only history instead of being
    // duplicated as mutable state on the request record.
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
  readKnownUser(userId);

  const expenseRequest = readExpenseRequest(requestId);

  return expenseRequest;
}

export function getStatusHistory(
  userId: string,
  requestId: string,
): StatusHistoryEntry[] {
  readKnownUser(userId);
  readExpenseRequestRecord(requestId);

  const statusHistoryRecords = db.listStatusHistory(requestId);
  const statusHistory = statusHistoryRecords.map(toStatusHistoryEntry);

  return statusHistory;
}

export function createExpenseRequest(
  userId: string,
  values: ExpenseValues,
): ExpenseRequest {
  readKnownUser(userId);

  // The request and its initial history entry form one business operation. A
  // database-backed implementation should wrap these two writes in a transaction.
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
  readKnownUser(userId);

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

  // The early check gives the caller a clear conflict. The DB write repeats the
  // sequence predicate because only that final check can close a concurrent race.
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

export function changeExpenseRequestStatus(
  userId: string,
  requestId: string,
  expectedStatusSequence: number,
  action: RequestAction,
): ExpenseRequest {
  const actor = readKnownUser(userId);
  const expenseRequestRecord = readExpenseRequestRecord(requestId);
  const latestStatus = readLatestStatus(requestId);
  const expenseRequest = toExpenseRequest(
    expenseRequestRecord,
    latestStatus,
  );

  // Reject a command that was already stale before evaluating its workflow
  // rules. The history append below still performs the decisive sequence check.
  if (latestStatus.sequence !== expectedStatusSequence) {
    throwStatusSequenceConflict();
  }

  const newStatus = validateAction(action, actor.id, expenseRequest);
  let assignedApproverId: string | null = null;

  if (action === RequestAction.Submit) {
    // Every submission revalidates the current values and recomputes routing, so
    // a previous approval assignment is never reused after withdrawal.
    const amountCents = validateExpenseForSubmission(expenseRequest.values);
    const requester = readRequester(expenseRequest.requesterId);
    const users = listUsers();
    const approver = selectApprover(requester, amountCents, users);

    assignedApproverId = approver.id;
  }

  const statusHistoryEntry: StatusHistoryEntry = {
    requestId,
    sequence: latestStatus.sequence + STATUS_SEQUENCE_INCREMENT,
    action,
    newStatus,
    actorId: actor.id,
    occurredAt: new Date().toISOString(),
    assignedApproverId,
  };
  const statusHistoryRecord = toStatusHistoryRecord(statusHistoryEntry);

  // The append performs the decisive sequence check. An undefined result means
  // another transition won after the earlier read.
  const appendedStatusRecord = db.appendStatusHistory(statusHistoryRecord);

  if (appendedStatusRecord === undefined) {
    throwStatusSequenceConflict();
  }

  const updatedExpenseRequest = toExpenseRequest(
    expenseRequestRecord,
    appendedStatusRecord,
  );

  return updatedExpenseRequest;
}

function readKnownUser(userId: string): User {
  const user = readUser(userId);

  if (user === undefined) {
    throw new BusinessError(
      BusinessErrorCode.UnknownUser,
      "The current user does not exist",
    );
  }

  return user;
}

function readRequester(requesterId: string): User {
  // The requester ID came from persisted request data, so a missing user record
  // is an internal consistency failure rather than an authentication failure.
  const requester = readUser(requesterId);

  if (requester === undefined) {
    throw new Error(`Expense requester ${requesterId} does not exist`);
  }

  return requester;
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
