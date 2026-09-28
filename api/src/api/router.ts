import { Router } from "express";

import { listUsersHandler } from "./handlers.js";

export function createApiRouter() {
  const router = Router();

  router.get("/users", listUsersHandler);

  return router;
}
