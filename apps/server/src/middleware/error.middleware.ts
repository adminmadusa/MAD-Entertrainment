import { HTTP_STATUS } from "@mad/shared";
import { ErrorRequestHandler, RequestHandler } from "express";

import { getEnv } from "../config/env";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public errors?: Record<string, string[]>,
    public isOperational = true,
    public code?: string,
    public retryable?: boolean,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(message = "Access denied") {
    return new AppError(message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(resource = "Resource") {
    const message = resource.endsWith("not found")
      ? resource
      : `${resource} not found`;
    return new AppError(message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(message: string) {
    return new AppError(message, HTTP_STATUS.CONFLICT);
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const reqLogger = req.log ?? logger;

  if (err instanceof AppError) {
    reqLogger.warn(
      { statusCode: err.statusCode, path: req.path, code: err.code },
      err.message,
    );
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { error: err.code } : {}),
      ...(err.retryable !== undefined ? { retryable: err.retryable } : {}),
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (err?.name === "ValidationError") {
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: "Validation failed",
      errors: parseMongooseValidationError(err),
    });
    return;
  }

  if (err?.code === 11000 || err?.code === "11000") {
    res
      .status(HTTP_STATUS.CONFLICT)
      .json({ success: false, message: "Duplicate entry" });
    return;
  }

  const env = getEnv();
  reqLogger.error({ err, path: req.path }, "Unhandled request error");
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : err.message,
    ...(env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
};

function parseMongooseValidationError(err: any) {
  const errors: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(err.errors ?? {})) {
    errors[field] = [(value as any).message ?? "Invalid value"];
  }
  return errors;
}
