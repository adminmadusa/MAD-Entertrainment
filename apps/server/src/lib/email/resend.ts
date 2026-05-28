import { Resend } from "resend";
import { getEnv } from "../../config/env";

let _resend: Resend | undefined;

/**
 * Returns the Resend client singleton.
 * Initialised lazily so test environments without RESEND_API_KEY
 * can import this module without crashing (the mock intercepts before it's called).
 */
export function getResendClient(): Resend {
  if (_resend) return _resend;

  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in environment variables.");
  }

  _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}
