import { AppError } from '../../middleware/error.middleware';
import { IDeadLetterJob } from '../../models/dead-letter-job.schema';
import { decryptPayload, isEncrypted } from '../../utils/encryption';

export function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  const redactedKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'clientSecret',
    'sessionId',
  ];

  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (redactedKeys.some((rk) => rk.toLowerCase() === key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else {
      result[key] = redactSecrets(obj[key]);
    }
  }
  return result;
}

export class DlqInspectionService {
  /**
   * Safely decrypts and redacts sensitive payload information from a dead letter queue job.
   */
  static inspectJobPayload(dlqJob: IDeadLetterJob): { data: any; stacktrace: any } {
    let payload = dlqJob.data;
    if (isEncrypted(payload)) {
      const decrypted = decryptPayload(payload);
      if (Buffer.byteLength(decrypted, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
      payload = JSON.parse(decrypted);
    } else if (payload) {
      const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (Buffer.byteLength(stringified, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
    }

    let stacktrace = dlqJob.stacktrace;
    if (Array.isArray(stacktrace) && stacktrace.length === 1 && isEncrypted(stacktrace[0])) {
      const decrypted = decryptPayload(stacktrace[0]);
      if (Buffer.byteLength(decrypted, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
      stacktrace = JSON.parse(decrypted);
    }

    const redactedPayload = redactSecrets(payload);

    return {
      data: redactedPayload,
      stacktrace,
    };
  }
}
