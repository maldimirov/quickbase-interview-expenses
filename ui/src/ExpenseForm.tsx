import { useState, type FormEvent } from "react";

import { ExpenseType, type ExpenseValues } from "./api";

interface ExpenseFormProps {
  initialValues: ExpenseValues;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (values: ExpenseValues) => Promise<void>;
}

export function ExpenseForm({
  initialValues,
  submitLabel,
  disabled = false,
  onSubmit,
}: ExpenseFormProps) {
  const [expenseType, setExpenseType] = useState<ExpenseType | "">(
    initialValues.expenseType ?? "",
  );
  const [amount, setAmount] = useState(
    formatAmountInput(initialValues.amountCents),
  );
  const [description, setDescription] = useState(
    initialValues.description ?? "",
  );
  const [billable, setBillable] = useState(initialValues.billable);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const parsedAmount = parseAmountInput(amount);
  const draftWarnings = getDraftWarnings(
    expenseType === "" ? null : expenseType,
    parsedAmount.valid ? parsedAmount.amountCents : null,
    description,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    if (!parsedAmount.valid) {
      setSaveError("Amount must be a money value with no more than two decimals");
      return;
    }

    const normalizedExpenseType = expenseType === "" ? null : expenseType;
    const normalizedDescription = normalizeOptionalText(description);
    const client = billable ? initialValues.client : null;
    const additionalJustification =
      parsedAmount.amountCents !== null && parsedAmount.amountCents >= 100_000
        ? initialValues.additionalJustification
        : null;
    const otherReason =
      expenseType === ExpenseType.Other ? initialValues.otherReason : null;
    const values: ExpenseValues = {
      expenseType: normalizedExpenseType,
      amountCents: parsedAmount.amountCents,
      description: normalizedDescription,
      billable,
      client,
      additionalJustification,
      otherReason,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Request could not be saved");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <fieldset
        className="expense-form__fields"
        disabled={disabled || isSaving}
      >
        <div className="field">
          <label htmlFor="expense-type">Expense type</label>
          <select
            id="expense-type"
            value={expenseType}
            onChange={(event) =>
              setExpenseType(event.target.value as ExpenseType | "")
            }
          >
            <option value="">Not selected</option>
            {Object.values(ExpenseType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <div className="money-input">
            <span aria-hidden="true">$</span>
            <input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          {!parsedAmount.valid && (
            <small className="error">Use a money value such as 12.50</small>
          )}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={billable}
            onChange={(event) => setBillable(event.target.checked)}
          />
          Billable to a client
        </label>

        {draftWarnings.length > 0 && (
          <div className="warning" role="status">
            <strong>Before submitting:</strong>
            <ul>
              {draftWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {saveError !== null && <p className="form-error">{saveError}</p>}

        <button className="primary-button" type="submit">
          {isSaving ? "Saving…" : submitLabel}
        </button>
      </fieldset>
    </form>
  );
}

function parseAmountInput(
  value: string,
): { valid: true; amountCents: number | null } | { valid: false } {
  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return { valid: true, amountCents: null };
  }

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmedValue);

  if (match === null) {
    return { valid: false };
  }

  const [, sign, wholePart, decimalPart = ""] = match;
  const wholeCents = Number(wholePart) * 100;
  const decimalCents = Number(decimalPart.padEnd(2, "0"));
  const amountCents = (wholeCents + decimalCents) * (sign === "-" ? -1 : 1);

  return Number.isSafeInteger(amountCents)
    ? { valid: true, amountCents }
    : { valid: false };
}

function formatAmountInput(amountCents: number | null): string {
  if (amountCents === null) {
    return "";
  }

  const sign = amountCents < 0 ? "-" : "";
  const absoluteAmount = Math.abs(amountCents);
  const wholePart = Math.floor(absoluteAmount / 100);
  const decimalPart = String(absoluteAmount % 100).padStart(2, "0");

  return `${sign}${wholePart}.${decimalPart}`;
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function getDraftWarnings(
  expenseType: ExpenseType | null,
  amountCents: number | null,
  description: string,
): string[] {
  const warnings: string[] = [];

  if (expenseType === null) {
    warnings.push("Select an expense type");
  }

  if (amountCents === null) {
    warnings.push("Enter an amount");
  } else if (amountCents < 0) {
    warnings.push("Amount cannot be negative");
  }

  if (description.trim() === "") {
    warnings.push("Enter a description");
  }

  return warnings;
}
