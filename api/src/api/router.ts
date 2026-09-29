import { Router } from "express";

import {
  createExpenseRequestHandler,
  getExpenseRequestHandler,
  getStatusHistoryHandler,
  listExpenseRequestsHandler,
  listUsersHandler,
  updateExpenseRequestHandler,
} from "./handlers.js";
import { requireUserId } from "./middlewares.js";

export function createApiRouter() {
  const router = Router();

  router.get("/users", listUsersHandler);
  router.use("/requests", requireUserId); // require a user for all request endpoints
  router.get("/requests", listExpenseRequestsHandler);
  router.post("/requests", createExpenseRequestHandler);
  router.get("/requests/:requestId", getExpenseRequestHandler);
  router.put("/requests/:requestId", updateExpenseRequestHandler);
  router.get("/requests/:requestId/history", getStatusHistoryHandler);

  return router;
}
