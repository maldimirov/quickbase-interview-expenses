import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  ExpenseType,
  HIGH_VALUE_EXPENSE_CENTS,
  type ExpenseValues,
} from "./models.js";

// Run these rules only during submission so a Draft can preserve incomplete or
// temporarily invalid values while the requester is still editing it.
export function validateExpenseForSubmission(
  values: ExpenseValues,
): number {
  const fieldErrors: Record<string, string[]> = {};
  const amountCents = values.amountCents;
  const requiresAdditionalJustification =
    amountCents !== null && amountCents >= HIGH_VALUE_EXPENSE_CENTS;
  const requiresOtherReason = values.expenseType === ExpenseType.Other;

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

  if (!values.billable && values.client !== null) {
    fieldErrors["values.client"] = [
      "Client is not allowed for a non-billable expense",
    ];
  }

  if (
    requiresAdditionalJustification &&
    isBlank(values.additionalJustification)
  ) {
    fieldErrors["values.additionalJustification"] = [
      "Extra justification is required for expenses of $1,000 or more",
    ];
  }

  if (
    !requiresAdditionalJustification &&
    values.additionalJustification !== null
  ) {
    fieldErrors["values.additionalJustification"] = [
      "Extra justification is only allowed for expenses of $1,000 or more",
    ];
  }

  if (requiresOtherReason && isBlank(values.otherReason)) {
    fieldErrors["values.otherReason"] = [
      "Other reason is required when the expense type is Other",
    ];
  }

  if (!requiresOtherReason && values.otherReason !== null) {
    fieldErrors["values.otherReason"] = [
      "Other reason must not be provided unless the expense type is Other",
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BusinessError(
      BusinessErrorCode.ExpenseRequestInvalid,
      "Expense request is not ready to submit",
      fieldErrors,
    );
  }

  // Collecting errors in a record does not let TypeScript infer that the earlier
  // null branch cannot reach this point, so guard the invariant explicitly.
  if (amountCents === null) {
    throw new Error("Validated expense request has no amount");
  }

  return amountCents;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === "";
}
