import type { NextFunction, Request, Response } from "express";

import {
  ApiErrorCode,
  type ApiErrorResponse,
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

  // The finish event contains the final status code and measures the complete
  // response rather than only the time spent before the handler returns.
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
  response: Response<ApiErrorResponse, UserIdLocals>,
  next: NextFunction,
): void {
  // This middleware only extracts the request identity.
  // Resolving the user is left to the business layer, so the HTTP middleware doesn't depend on DB data.
  const parsedUserId = userIdHeaderSchema.safeParse(
    request.header(USER_ID_HEADER),
  );

  if (!parsedUserId.success || parsedUserId.data.length==0) {
    response.status(401).json({
      code: ApiErrorCode.MissingUserId,
      message: `A non-empty ${USER_ID_HEADER} header is required`,
    });
    return;
  }

  response.locals.userId = parsedUserId.data;
  next();
}
