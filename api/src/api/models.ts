import { z } from "zod";

import { UserRole } from "../business/models.js";

export const USER_ID_HEADER = "X-User-Id";

export const userIdHeaderSchema = z.string().trim().min(1);

export const userRoleSchema = z.enum(UserRole);

export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: userRoleSchema,
  managerId: z.string().nullable(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export interface UserIdLocals {
  userId: string;
}
