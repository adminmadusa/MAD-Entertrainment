import { z } from "zod";

export function getFirstValidationError(
  result: z.SafeParseReturnType<unknown, unknown>,
  fallback = "Please fix validation errors.",
) {
  if (result.success) return "";
  return result.error.issues[0]?.message || fallback;
}
