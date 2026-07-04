import { z } from 'zod';

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
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
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
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
});
