import express from "express";

import { apiErrorHandler } from "./api/errors.js";
import { requestLogger } from "./api/middlewares.js";
import { createApiRouter } from "./api/router.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(express.json());
  app.use("/api", createApiRouter());
  app.use(apiErrorHandler);

  return app;
}
