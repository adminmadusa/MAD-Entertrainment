import { z } from 'zod';
import { PASSWORD_PATTERNS, AUTH_ERROR_MESSAGES } from '@mad/shared';

const adminPasswordSchema = z
  .string()
  .min(8, AUTH_ERROR_MESSAGES.PASSWORD_MIN_LENGTH)
  .regex(PASSWORD_PATTERNS.UPPERCASE, AUTH_ERROR_MESSAGES.PASSWORD_UPPERCASE)
  .regex(PASSWORD_PATTERNS.LOWERCASE, AUTH_ERROR_MESSAGES.PASSWORD_LOWERCASE)
  .regex(PASSWORD_PATTERNS.NUMBER, AUTH_ERROR_MESSAGES.PASSWORD_NUMBER)
  .regex(PASSWORD_PATTERNS.SPECIAL, AUTH_ERROR_MESSAGES.PASSWORD_SPECIAL);

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    role: z.enum(['super_admin', 'admin', 'manager', 'support', 'scanner']),
    password: adminPasswordSchema,
  }),
});

export const updateAdminSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  }),
});

export const updateAdminRoleSchema = z.object({
  body: z.object({
    role: z.enum(['super_admin', 'admin', 'manager', 'support', 'scanner']),
  }),
});

export const resetAdminPasswordSchema = z.object({
  body: z.object({
    password: adminPasswordSchema,
  }),
});

