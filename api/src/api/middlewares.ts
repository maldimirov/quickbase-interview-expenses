import type { NextFunction, Request, Response } from "express";

import {
  AuthenticationErrorCode,
  type AuthenticationErrorResponse,
} from "./errors.js";
import {
  USER_ID_HEADER,
  type UserIdLocals,
  userIdHeaderSchema,
} from "./models.js";

export type { UserIdLocals } from "./models.js";

export function requestLogger(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = performance.now();

  response.on("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);

    console.log(
      `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
    );
  });

  next();
}

export function requireUserId(
  request: Request,
  response: Response<AuthenticationErrorResponse, UserIdLocals>,
  next: NextFunction,
): void {
  const parsedUserId = userIdHeaderSchema.safeParse(
    request.header(USER_ID_HEADER),
  );

  if (!parsedUserId.success) {
    response.status(401).json({
      code: AuthenticationErrorCode.MissingUserId,
      message: `${USER_ID_HEADER} header is required`,
    });
    return;
  }

  response.locals.userId = parsedUserId.data;
  next();
}
