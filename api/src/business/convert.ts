import type { UserRecord } from "../db/models.js";
import { UserRole, type User } from "./models.js";

export function toUser(userRecord: UserRecord): User {
  return {
    id: userRecord.id,
    name: userRecord.name,
    role: userRecord.role as UserRole,
    managerId: userRecord.managerId,
  };
}
