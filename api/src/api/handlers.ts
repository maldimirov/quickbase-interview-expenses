import type { Request, Response } from "express";

import { getHealth } from "../business/health.js";

interface HealthResponse {
  status: "ok";
}

export function getHealthHandler(
  _request: Request,
  response: Response<HealthResponse>,
): void {
  const health = getHealth();
  const body: HealthResponse = {
    status: health.status,
  };

  response.status(200).json(body);
}
