import { z } from 'zod';
import { OBJECT_ID_REGEX, VALIDATION_ERROR_MESSAGES } from '@mad/shared';

/**
 * MongoDB ObjectId regex validator (24 hex characters).
 * Single source of truth for ObjectId validation across packages.
 */
export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, VALIDATION_ERROR_MESSAGES.INVALID_OBJECT_ID);

