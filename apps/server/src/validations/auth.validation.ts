import { z } from 'zod';

const emptyBodyToObject = (value: unknown) => value ?? {};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(254, 'Email is too long');

const otpSchema = z
  .string()
  .trim()
  .min(6, 'Passcode must be 6 digits')
  .max(6, 'Passcode must be 6 digits')
  .regex(/^\d{6}$/, 'Passcode must be 6 digits');

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

export const checkEmailSchema = z.object({
  email: emailSchema,
}).strict();

export const magicLinkSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(100, 'First name is too long').optional(),
  lastName: z.string().trim().max(100, 'Last name is too long').optional(),
  mobileNumber: z.string().trim().max(50, 'Mobile number is too long').optional(),
}).strict();

export const verifyAuthSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
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

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/, 'Mobile number must be in valid E.164 international format (e.g. +14155552671 or +919876543210)')
    .optional()
    .or(z.literal('')), // Allows clearing the mobile number by sending an empty string
}).strict();

