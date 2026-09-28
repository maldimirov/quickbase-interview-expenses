import * as db from "../db/users.js";
import { toUser } from "./convert.js";
import type { User } from "./models.js";

export function listUsers(): User[] {
  return db.listUsers().map(toUser);
}

export function readUser(userId: string): User | undefined {
  const userRecord = db.readUser(userId);

  return userRecord === undefined ? undefined : toUser(userRecord);
}
