import { z } from "zod";

import {
  Client,
  ExpenseType,
  RequestAction,
  type RequestStatus,
  type UserRole,
} from "../business/models.js";

export const USER_ID_HEADER = "X-User-Id";

export const userIdHeaderSchema = z.string().trim().min(1);

export interface UserResponse {
  id: string;
  name: string;
  role: UserRole;
  managerId: string | null;
}

export interface ExpenseValues {
  expenseType: ExpenseType | null;
  amountCents: number | null;
  description: string | null;
  billable: boolean;
  client: Client | null;
  additionalJustification: string | null;
  otherReason: string | null;
}

export const expenseTypeSchema = z.enum(ExpenseType);
export const clientSchema = z.enum(Client);

// Treat editable values as an explicit allow-list so unexpected form data
// cannot cross the HTTP boundary unnoticed.
export const expenseValuesSchema: z.ZodType<ExpenseValues> = z
  .object({
    expenseType: expenseTypeSchema.nullable(),
    amountCents: z.number().int().nullable(),
    description: z.string().nullable(),
    billable: z.boolean(),
    client: clientSchema.nullable(),
    additionalJustification: z.string().nullable(),
    otherReason: z.string().nullable(),
  })
  .strict();

// Keep request body schemas strict so server-owned root fields such as requester,
// status, and approver are rejected instead of silently discarded.
export const createExpenseRequestBodySchema = z
  .object({
    values: expenseValuesSchema,
  })
  .strict();

export const updateExpenseRequestBodySchema = z
  .object({
    values: expenseValuesSchema,
    expectedStatusSequence: z.number().int().positive(),
  })
  .strict();

export const changeExpenseRequestStatusBodySchema = z
  .object({
    // CREATE is produced internally when the request record is created. Clients
    // can request only user-driven workflow operations.
    action: z.enum([
      RequestAction.Submit,
      RequestAction.Withdraw,
      RequestAction.Approve,
      RequestAction.Reject,
    ]),
    expectedStatusSequence: z.number().int().positive(),
  })
  .strict();

export const requestParamsSchema = z
  .object({
    requestId: z.string().trim().min(1),
  })
  .strict();

export interface ExpenseRequestResponse {
  id: string;
  requesterId: string;
  values: ExpenseValues;
  status: RequestStatus;
  statusSequence: number;
  assignedApproverId: string | null;
}

export interface StatusHistoryEntryResponse {
  requestId: string;
  sequence: number;
  action: RequestAction;
  newStatus: RequestStatus;
  actorId: string;
  occurredAt: string;
  assignedApproverId: string | null;
}

export interface UserIdLocals {
  userId: string;
}
