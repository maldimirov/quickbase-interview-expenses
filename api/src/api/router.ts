import { Router } from "express";

import {
  changeExpenseRequestStatusHandler,
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

  // Keep the user list public for the demo picker, then require an acting user
  // for every request route declared below this middleware.
  router.use("/requests", requireUserId);
  router.get("/requests", listExpenseRequestsHandler);
  router.post("/requests", createExpenseRequestHandler);
  router.get("/requests/:requestId", getExpenseRequestHandler);
  router.put("/requests/:requestId", updateExpenseRequestHandler);
  router.post(
    "/requests/:requestId/status",
    changeExpenseRequestStatusHandler,
  );
  router.get("/requests/:requestId/history", getStatusHistoryHandler);

  return router;
}
