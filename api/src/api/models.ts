import { z } from "zod";

import {
  ExpenseType,
  type RequestAction,
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
  client: string | null;
  additionalJustification: string | null;
  otherReason: string | null;
}

export const expenseTypeSchema = z.enum(ExpenseType);

export const expenseValuesSchema: z.ZodType<ExpenseValues> = z
  .object({
    expenseType: expenseTypeSchema.nullable(),
    amountCents: z.number().int().nullable(),
    description: z.string().nullable(),
    billable: z.boolean(),
    client: z.string().nullable(),
    additionalJustification: z.string().nullable(),
    otherReason: z.string().nullable(),
  })
  .strict();

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
