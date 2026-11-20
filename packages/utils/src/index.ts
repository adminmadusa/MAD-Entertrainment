import type { ApiError } from '@mad/types';

export type { ApiError };

// ─── HTTP Status → User-Facing Message Map ──────────────────────────────────
// Only used as a fallback when the backend does NOT provide a message.
// 400, 409, 422 intentionally excluded — backend messages are already user-readable.
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: "We couldn't find what you're looking for.",
  429: 'Too many attempts. Please wait before trying again.',
};

function mapHttpStatus(status: number): string {
  if (HTTP_STATUS_MESSAGES[status]) {
    return HTTP_STATUS_MESSAGES[status];
  }
  if (status >= 500 && status <= 599) {
    return 'Something went wrong on our side. Please try again in a few moments.';
  }
  return 'An unexpected error occurred. Please try again.';
}

// Axios network-failure error codes (no HTTP response received)
const NETWORK_ERROR_CODES = new Set(['ECONNABORTED', 'ECONNRESET', 'ERR_NETWORK', 'ETIMEDOUT', 'ERR_INTERNET_DISCONNECTED']);

function isNetworkError(error: { code?: string; message?: string }): boolean {
  if (error.code && NETWORK_ERROR_CODES.has(error.code)) return true;
  const msg = error.message?.toLowerCase() ?? '';
  return (
    msg.includes('network error') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('failed to fetch') ||
    msg.includes('net::err')
  );
}

const OFFLINE_MESSAGE = "You're currently offline. Please check your internet connection and try again.";

/**
 * Translate any thrown error into a safe, user-facing ApiError.
 *
 * Precedence:
 *   1. Backend response.data.message  (highest — always user-readable from AppError)
 *   2. HTTP status fallback map       (for 401/403/404/429/5xx without a body)
 *   3. Network / offline detection    (no response received)
 *   4. Generic safe fallback          (never exposes raw Axios internals)
 */
export function extractApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: Partial<ApiError & { retryAfter?: number }>; status?: number };
      code?: string;
      message?: string;
    };

    // ── 1. Server responded with a structured body ─────────────────────────
    if (maybeError.response) {
      const status = maybeError.response.status ?? 0;
      const data = maybeError.response.data;

      // Backend message is trusted for 400 / 409 / 422 (validation/conflict)
      // For other codes: prefer backend message if present, else use status map.
      const backendMessage = data?.message;
      const useBackendMessage =
        backendMessage &&
        (status === 400 || status === 409 || status === 422 || backendMessage.length > 0);

      return {
        message: useBackendMessage ? backendMessage! : mapHttpStatus(status),
        statusCode: data?.statusCode ?? status,
        code: data?.code ?? (data as Record<string, unknown> | undefined)?.['error'] as string | undefined,
        details: data?.details,
        errors: data?.errors,
        retryAfter: data?.retryAfter,
      };
    }

    // ── 2. No response — network / offline failure ─────────────────────────
    if (isNetworkError(maybeError)) {
      return { message: OFFLINE_MESSAGE };
    }
  }

  // ── 3. Generic safe fallback — never expose raw Axios message strings ────
  return { message: 'Something went wrong. Please try again.' };
}

export * from './jwt';
export * from './date';
export * from './image';
