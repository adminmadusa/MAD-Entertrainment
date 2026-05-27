import { requiredEnv } from "./required-env";

export function assertRequiredEnv(rawEnv: NodeJS.ProcessEnv): void {
  const missing = requiredEnv.filter((key) => {
    const value = rawEnv[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

export function parseAllowedOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
