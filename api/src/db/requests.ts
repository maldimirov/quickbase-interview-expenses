import type {
  ExpenseRequestRecord,
  StatusHistoryRecord,
} from "./models.js";
import { seedExpenseRequests, seedStatusHistory } from "./seed.js";

const expenseRequests = [...seedExpenseRequests];
const statusHistory = [...seedStatusHistory];

export function listExpenseRequests(): ExpenseRequestRecord[] {
  return [...expenseRequests];
}

export function readExpenseRequest(
  requestId: string,
): ExpenseRequestRecord | undefined {
  return expenseRequests.find(({ id }) => id === requestId);
}

export function listStatusHistory(requestId: string): StatusHistoryRecord[] {
  return statusHistory.filter((record) => record.requestId === requestId);
}
