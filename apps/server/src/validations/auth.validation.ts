import { z } from 'zod';
import {
  emailSchema,
  otpSchema,
  checkEmailSchema,
  verifyAuthSchema,
  updateProfileSchema
} from '@mad/validations';

export {
  emailSchema,
  otpSchema,
  checkEmailSchema,
  verifyAuthSchema,
  updateProfileSchema
};

const emptyBodyToObject = (value: unknown) => value ?? {};

const refreshTokenSchema = z
  .string()
  .trim()
  .min(1, 'Refresh token is required')
  .max(512, 'Refresh token is too long');

export const googleAuthSchema = z.object({
  idToken: z
    .string()
    .trim()
    .min(1, 'Google ID Token is required')
    .max(4096, 'Google ID Token is too long'),
}).strict();

export const magicLinkSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(100, 'First name is too long').optional(),
  lastName: z.string().trim().max(100, 'Last name is too long').optional(),
  mobileNumber: z.string().trim().max(50, 'Mobile number is too long').optional(),
}).strict();

export const refreshAuthSchema = z.preprocess(
  emptyBodyToObject,
  z.object({
    refreshToken: refreshTokenSchema.optional(),
  }).strict()
);

export const logoutAuthSchema = z.preprocess(
  emptyBodyToObject,
  z.object({
    refreshToken: refreshTokenSchema.optional(),
  }).strict()
);
