import { Response } from 'express';

import { HTTP_STATUS } from '@mad/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: number = HTTP_STATUS.OK
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created'
): void {
  sendSuccess(
    res,
    data,
    message,
    HTTP_STATUS.CREATED
  );
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  errors?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

export function sendUnauthorized(
  res: Response,
  message = 'Unauthorized'
): void {
  sendError(
    res,
    message,
    HTTP_STATUS.UNAUTHORIZED
  );
}

export function sendForbidden(
  res: Response,
  message = 'Forbidden'
): void {
  sendError(
    res,
    message,
    HTTP_STATUS.FORBIDDEN
  );
}
