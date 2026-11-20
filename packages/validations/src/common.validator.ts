import { z } from 'zod';

/**
 * MongoDB ObjectId regex validator (24 hex characters).
 * Single source of truth for ObjectId validation across packages.
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Mongoose ObjectId identifier');
