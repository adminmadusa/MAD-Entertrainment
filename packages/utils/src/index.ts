export type ApiError = {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  errors?: Record<string, string[]>;
};

export function extractApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: { data?: Partial<ApiError>; status?: number };
      message?: string;
    };

    if (maybeError.response?.data) {
      return {
        message:
          maybeError.response.data.message ??
          maybeError.message ??
          "Request failed",
        statusCode:
          maybeError.response.data.statusCode ?? maybeError.response.status,
        code: maybeError.response.data.code,
        details: maybeError.response.data.details,
        errors: maybeError.response.data.errors,
      };
    }

    if (maybeError.message) {
      return { message: maybeError.message };
    }
  }

  return { message: "Request failed" };
}
