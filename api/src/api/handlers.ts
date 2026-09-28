import type { Request, Response } from "express";

import { listUsers } from "../business/users.js";
import { toUserResponse } from "./convert.js";
import type { UserResponse } from "./models.js";

export function listUsersHandler(
  _request: Request,
  response: Response<UserResponse[]>,
): void {
  const users = listUsers();

  response.status(200).json(users.map(toUserResponse));
}
