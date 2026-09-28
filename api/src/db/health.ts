export interface HealthRecord {
  available: boolean;
}

export function readHealth(): HealthRecord {
  return {
    available: true,
  };
}
