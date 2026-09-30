import { useState, type FormEvent } from "react";

import {
  Client,
  ExpenseType,
  HIGH_VALUE_EXPENSE_CENTS,
  type ExpenseValues,
  type FieldErrors,
} from "./api";

const FIELD_PATHS = {
  expenseType: "values.expenseType",
  amountCents: "values.amountCents",
  description: "values.description",
  client: "values.client",
  additionalJustification: "values.additionalJustification",
  otherReason: "values.otherReason",
} as const;

interface ExpenseFormProps {
  initialValues: ExpenseValues;
  submitLabel: string;
  disabled?: boolean;
  fieldErrors?: FieldErrors;
  onDirtyChange?: (hasUnsavedChanges: boolean) => void;
  onSubmit: (values: ExpenseValues) => Promise<void>;
}

export function ExpenseForm({
  initialValues,
  submitLabel,
  disabled = false,
  fieldErrors = {},
  onDirtyChange,
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
  const [client, setClient] = useState<Client | "">(
    initialValues.client ?? "",
  );
  const [additionalJustification, setAdditionalJustification] = useState(
    initialValues.additionalJustification ?? "",
  );
  const [otherReason, setOtherReason] = useState(
    initialValues.otherReason ?? "",
  );
  // Track interaction instead of comparing complete values. Returning a field
  // to its original value still requires an explicit save.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const parsedAmount = parseAmountInput(amount);
  const normalizedExpenseType = expenseType === "" ? null : expenseType;
  const amountCents = parsedAmount.valid ? parsedAmount.amountCents : null;
  const showAdditionalJustification =
    amountCents !== null && amountCents >= HIGH_VALUE_EXPENSE_CENTS;
  const showOtherReason = expenseType === ExpenseType.Other;

  // Build the complete replacement payload from visible controls. Hidden
  // conditional fields become null so stale values are not retained by PUT.
  const draftValues: ExpenseValues = {
    expenseType: normalizedExpenseType,
    amountCents,
    description: normalizeOptionalText(description),
    billable,
    client: billable && client !== "" ? client : null,
    additionalJustification: showAdditionalJustification
      ? normalizeOptionalText(additionalJustification)
      : null,
    otherReason: showOtherReason ? normalizeOptionalText(otherReason) : null,
  };
  const draftWarnings = getDraftWarnings(draftValues);
  const hasFieldErrors = Object.values(fieldErrors).some(
    (messages) => messages.length > 0,
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

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSubmit(draftValues);
      setDescription(draftValues.description ?? "");
      setAmount(formatAmountInput(draftValues.amountCents));
      setClient(draftValues.client ?? "");
      setAdditionalJustification(
        draftValues.additionalJustification ?? "",
      );
      setOtherReason(draftValues.otherReason ?? "");
      setHasUnsavedChanges(false);
      onDirtyChange?.(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Request could not be saved";

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  function markFormChanged() {
    setHasUnsavedChanges(true);
    onDirtyChange?.(true);
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <fieldset
        className="expense-form__fields"
        disabled={disabled || isSaving}
      >
        {hasFieldErrors && (
          <div className="form-error" role="alert">
            Correct the highlighted fields before submitting.
          </div>
        )}

        <div className="field">
          <label htmlFor="expense-type">Expense type</label>
          <select
            aria-invalid={hasErrors(fieldErrors, FIELD_PATHS.expenseType)}
            id="expense-type"
            value={expenseType}
            onChange={(event) => {
              setExpenseType(event.target.value as ExpenseType | "");
              markFormChanged();
            }}
          >
            <option value="">Not selected</option>
            {Object.values(ExpenseType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FieldErrorMessages
            messages={fieldErrors[FIELD_PATHS.expenseType]}
          />
        </div>

        {showOtherReason && (
          <div className="field">
            <label htmlFor="other-reason">Other reason</label>
            <textarea
              aria-invalid={hasErrors(fieldErrors, FIELD_PATHS.otherReason)}
              id="other-reason"
              rows={3}
              value={otherReason}
              onChange={(event) => {
                setOtherReason(event.target.value);
                markFormChanged();
              }}
            />
            <FieldErrorMessages
              messages={fieldErrors[FIELD_PATHS.otherReason]}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <div
            className={`money-input${
              !parsedAmount.valid ||
              hasErrors(fieldErrors, FIELD_PATHS.amountCents)
                ? " money-input--invalid"
                : ""
            }`}
          >
            <span aria-hidden="true">$</span>
            <input
              aria-invalid={
                !parsedAmount.valid ||
                hasErrors(fieldErrors, FIELD_PATHS.amountCents)
              }
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                markFormChanged();
              }}
            />
          </div>
          {!parsedAmount.valid && (
            <small className="error">Use a money value such as 12.50</small>
          )}
          <FieldErrorMessages
            messages={fieldErrors[FIELD_PATHS.amountCents]}
          />
        </div>

        {showAdditionalJustification && (
          <div className="field">
            <label htmlFor="additional-justification">
              Extra justification
            </label>
            <textarea
              aria-invalid={hasErrors(
                fieldErrors,
                FIELD_PATHS.additionalJustification,
              )}
              id="additional-justification"
              rows={3}
              value={additionalJustification}
              onChange={(event) => {
                setAdditionalJustification(event.target.value);
                markFormChanged();
              }}
            />
            <FieldErrorMessages
              messages={fieldErrors[FIELD_PATHS.additionalJustification]}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            aria-invalid={hasErrors(fieldErrors, FIELD_PATHS.description)}
            id="description"
            rows={4}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              markFormChanged();
            }}
          />
          <FieldErrorMessages
            messages={fieldErrors[FIELD_PATHS.description]}
          />
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={billable}
            onChange={(event) => {
              setBillable(event.target.checked);
              markFormChanged();
            }}
          />
          Billable to a client
        </label>

        {billable && (
          <div className="field">
            <label htmlFor="client">Client</label>
            <select
              aria-invalid={hasErrors(fieldErrors, FIELD_PATHS.client)}
              id="client"
              value={client}
              onChange={(event) => {
                setClient(event.target.value as Client | "");
                markFormChanged();
              }}
            >
              <option value="">Not selected</option>
              {Object.values(Client).map((clientOption) => (
                <option key={clientOption} value={clientOption}>
                  {clientOption}
                </option>
              ))}
            </select>
            <FieldErrorMessages messages={fieldErrors[FIELD_PATHS.client]} />
          </div>
        )}

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

        <button
          className="primary-button"
          type="submit"
          disabled={!hasUnsavedChanges}
        >
          {isSaving ? "Saving…" : submitLabel}
        </button>
      </fieldset>
    </form>
  );
}

function parseAmountInput(
  value: string,
): { valid: true; amountCents: number | null } | { valid: false } {
  // Parse decimal digits directly into cents so money does not pass through
  // floating-point arithmetic before it reaches the API.
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

function getDraftWarnings(values: ExpenseValues): string[] {
  // Warnings mirror submission rules for immediate feedback, but they do not
  // block Draft saves or replace authoritative server validation.
  const warnings: string[] = [];

  if (values.expenseType === null) {
    warnings.push("Select an expense type");
  }

  if (values.amountCents === null) {
    warnings.push("Enter an amount");
  } else if (values.amountCents < 0) {
    warnings.push("Amount cannot be negative");
  }

  if (values.description === null) {
    warnings.push("Enter a description");
  }

  if (values.billable && values.client === null) {
    warnings.push("Select a client");
  }

  if (
    values.amountCents !== null &&
    values.amountCents >= HIGH_VALUE_EXPENSE_CENTS &&
    values.additionalJustification === null
  ) {
    warnings.push("Enter extra justification for expenses of $1,000 or more");
  }

  if (
    values.expenseType === ExpenseType.Other &&
    values.otherReason === null
  ) {
    warnings.push("Explain the Other expense type");
  }

  return warnings;
}

function hasErrors(fieldErrors: FieldErrors, fieldPath: string): boolean {
  return (fieldErrors[fieldPath]?.length ?? 0) > 0;
}

function FieldErrorMessages({
  messages,
}: {
  messages: string[] | undefined;
}) {
  if (messages === undefined || messages.length === 0) {
    return null;
  }

  return (
    <ul className="field-errors">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
