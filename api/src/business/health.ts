import * as db from "../db/health.js";

export interface Health {
  status: "ok";
}

export function getHealth(): Health {
  const healthRecord = db.readHealth();

  if (!healthRecord.available) {
    throw new Error("In-memory storage is unavailable");
  }

  return {
    status: "ok",
  };
}
