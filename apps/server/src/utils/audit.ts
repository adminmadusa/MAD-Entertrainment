import { logger } from "./logger";
import { getTraceContext } from "./context";

export interface AuditLogPayload {
  action: string;
  actor?: {
    type: "user" | "admin" | "system" | "guest";
    id?: string;
  };
  status: "success" | "failure" | "pending";
  metadata?: Record<string, any>;
  description?: string;
}

export function auditLog(payload: AuditLogPayload) {
  const context = getTraceContext();
  logger.info(
    {
      audit: true,
      correlationId: context?.correlationId,
      actor:
        payload.actor ||
        (context
          ? {
              type: context.userId
                ? "user"
                : context.sessionId
                  ? "guest"
                  : "system",
              id: context.userId || context.sessionId,
            }
          : { type: "system" }),
      ...payload,
    },
    `[AUDIT] ${payload.action}: ${payload.description || ""}`,
  );
}
