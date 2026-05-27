export const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_ADMIN_SECRET',
  'JWT_SESSION_SECRET',
  'ALLOWED_ORIGINS',
] as const;

export type RequiredEnvKey = (typeof requiredEnv)[number];
