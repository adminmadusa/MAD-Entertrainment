import type { AuthUser as SharedAuthUser } from '@mad/types';
export type AuthUser = SharedAuthUser;

export interface AuthResponse {
  token: string;
  user: AuthUser;
  onboardingRequired?: boolean;
}

export interface VerificationCodePayload {
  email: string;
}

export interface VerifyVerificationCodeOrOTPPayload {
  otp: string;
  email: string;
}

export interface VerificationCodeRequestResponse {
  success: boolean;
  message: string;
}
