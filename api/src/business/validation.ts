import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  ExpenseType,
  HIGH_VALUE_EXPENSE_CENTS,
  type ExpenseValues,
} from "./models.js";

export function validateExpenseForSubmission(
  values: ExpenseValues,
): number {
  const fieldErrors: Record<string, string[]> = {};
  const amountCents = values.amountCents;

  if (values.expenseType === null) {
    fieldErrors["values.expenseType"] = ["Expense type is required"];
  }

  if (amountCents === null) {
    fieldErrors["values.amountCents"] = ["Amount is required"];
  } else if (amountCents < 0) {
    fieldErrors["values.amountCents"] = ["Amount cannot be negative"];
  }

  if (isBlank(values.description)) {
    fieldErrors["values.description"] = ["Description is required"];
  }

  if (values.billable && isBlank(values.client)) {
    fieldErrors["values.client"] = [
      "Client is required for a billable expense",
    ];
  }

  if (
    amountCents !== null &&
    amountCents >= HIGH_VALUE_EXPENSE_CENTS &&
    isBlank(values.additionalJustification)
  ) {
    fieldErrors["values.additionalJustification"] = [
      "Extra justification is required for expenses of $1,000 or more",
    ];
  }

  if (
    values.expenseType === ExpenseType.Other &&
    isBlank(values.otherReason)
  ) {
    fieldErrors["values.otherReason"] = [
      "Other reason is required when the expense type is Other",
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestInvalid,
      "Expense request is not ready to submit",
      fieldErrors,
    );
  }

  if (amountCents === null) {
    throw new Error("Validated expense request has no amount");
  }

  return amountCents;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === "";
}
