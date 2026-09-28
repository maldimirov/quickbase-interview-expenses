import { Router } from "express";

import { getHealthHandler } from "./handlers.js";

export function createApiRouter() {
  const router = Router();

  router.get("/health", getHealthHandler);

  return router;
}
