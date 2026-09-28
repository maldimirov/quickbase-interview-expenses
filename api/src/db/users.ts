import { seedUsers } from "./seed.js";
import type { UserRecord } from "./models.js";

const users = [...seedUsers];

export function listUsers(): UserRecord[] {
  return [...users];
}

export function readUser(userId: string): UserRecord | undefined {
  return users.find(({ id }) => id === userId);
}
