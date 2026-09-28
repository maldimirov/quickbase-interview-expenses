import type { User } from "../business/models.js";
import type { UserResponse } from "./models.js";

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
  };
}
