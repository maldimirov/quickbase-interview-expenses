import * as db from "../db/users.js";
import { toUser } from "./convert.js";
import type { User } from "./models.js";

export function listUsers(): User[] {
  const userRecords = db.listUsers();
  const users = userRecords.map(toUser);

  return users;
}

export function readUser(userId: string): User | undefined {
  const userRecord = db.readUser(userId);

  if (userRecord === undefined) {
    return undefined;
  }

  const user = toUser(userRecord);

  return user;
}
