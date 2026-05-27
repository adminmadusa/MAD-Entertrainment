import { apiClient } from "./client";

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: "connected" | "disconnected";
    razorpay: "enabled" | "disabled";
    stripe: "enabled" | "disabled";
  };
  version: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>("/health");
  return data;
}
