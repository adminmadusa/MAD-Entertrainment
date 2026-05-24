import jwt, { SignOptions } from 'jsonwebtoken';

import { AdminRole } from '@mad/shared';

import { getEnv } from '../config/env';

export interface JwtUserPayload {
  sub: string;
  email?: string;
  role?: string;
}

export interface JwtAdminPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

export function extractBearerToken(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}

export function signUserToken(payload: JwtUserPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function signAdminToken(payload: JwtAdminPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_ADMIN_SECRET, { expiresIn: env.JWT_ADMIN_EXPIRES_IN } as SignOptions);
}

export function verifyUserToken(token: string): JwtUserPayload {
  return jwt.verify(token, getEnv().JWT_SECRET) as JwtUserPayload;
}

export function verifyAdminToken(token: string): JwtAdminPayload {
  return jwt.verify(token, getEnv().JWT_ADMIN_SECRET) as JwtAdminPayload;
}

export function signSessionToken(sessionId: string): string {
  const env = getEnv();
  return jwt.sign({ sessionId }, env.JWT_SECRET, { expiresIn: '1d' } as SignOptions);
}

export function verifySessionToken(token: string): string {
  const env = getEnv();
  const payload = jwt.verify(token, env.JWT_SECRET) as { sessionId: string };
  return payload.sessionId;
}
