import type {
  ExpenseRequestRecord,
  ExpenseValuesRecord,
  StatusHistoryRecord,
} from "./models.js";
import { seedExpenseRequests, seedStatusHistory } from "./seed.js";

const REQUEST_ID_PREFIX = "REQ-";
const REQUEST_ID_DIGITS = 3;
const NO_STATUS_SEQUENCE = 0;
const STATUS_SEQUENCE_INCREMENT = 1;

const expenseRequests = [...seedExpenseRequests];
const statusHistory = [...seedStatusHistory];
let requestIdCounter = expenseRequests.length;

export function listExpenseRequests(): ExpenseRequestRecord[] {
  return [...expenseRequests];
}

export function readExpenseRequest(
  requestId: string,
): ExpenseRequestRecord | undefined {
  return expenseRequests.find(({ id }) => id === requestId);
}

export function listStatusHistory(requestId: string): StatusHistoryRecord[] {
  // Status entries are appended in sequence order. A SQL implementation should
  // make this contract explicit with ORDER BY sequence ASC.
  return statusHistory.filter((record) => record.requestId === requestId);
}

export function readLatestStatusHistory(
  requestId: string,
): StatusHistoryRecord | undefined {
  const statusHistoryRecords = listStatusHistory(requestId);

  // A SQL implementation should use ORDER BY sequence DESC LIMIT 1.
  return statusHistoryRecords.at(-1);
}

export function createExpenseRequest(
  request: Omit<ExpenseRequestRecord, "id">,
): ExpenseRequestRecord {
  const requestId = allocateRequestId();
  const expenseRequest = {
    id: requestId,
    ...request,
  };

  expenseRequests.push(expenseRequest);

  return expenseRequest;
}

export function appendStatusHistory(
  statusHistoryRecord: StatusHistoryRecord,
): StatusHistoryRecord | undefined {
  const requestId = statusHistoryRecord.requestId;
  const expenseRequestExists = expenseRequests.some(({ id }) => id === requestId);
  const latestStatus = readLatestStatusHistory(requestId);
  const currentStatusSequence = latestStatus?.sequence ?? NO_STATUS_SEQUENCE;
  const nextStatusSequence =
    currentStatusSequence + STATUS_SEQUENCE_INCREMENT;

  // A SQL implementation should perform the latest-sequence check and insert in
  // one transaction. A foreign key enforces request existence, and a unique
  // constraint on (request_id, sequence) rejects concurrent inserts for the
  // same next sequence.
  if (
    !expenseRequestExists ||
    statusHistoryRecord.sequence !== nextStatusSequence
  ) {
    return undefined;
  }

  statusHistory.push(statusHistoryRecord);

  return statusHistoryRecord;
}

export function replaceExpenseRequestValues(
  requestId: string,
  expectedStatusSequence: number,
  values: ExpenseValuesRecord,
): ExpenseRequestRecord | undefined {
  const requestIndex = expenseRequests.findIndex(({ id }) => id === requestId);
  const latestStatus = readLatestStatusHistory(requestId);

  // A SQL implementation should express these conditions in the UPDATE so the
  // values change only while the observed status sequence is still current.
  // Zero affected rows represents the same missing-or-stale result.
  if (
    requestIndex === -1 ||
    latestStatus === undefined ||
    latestStatus.sequence !== expectedStatusSequence
  ) {
    return undefined;
  }

  const expenseRequest = expenseRequests[requestIndex];

  if (expenseRequest === undefined) {
    return undefined;
  }

  const updatedExpenseRequest = {
    ...expenseRequest,
    values,
  };

  expenseRequests[requestIndex] = updatedExpenseRequest;

  return updatedExpenseRequest;
}

function allocateRequestId(): string {
  requestIdCounter += 1;

  const requestNumber = String(requestIdCounter).padStart(
    REQUEST_ID_DIGITS,
    "0",
  );
  const requestId = `${REQUEST_ID_PREFIX}${requestNumber}`;

  return requestId;
}
