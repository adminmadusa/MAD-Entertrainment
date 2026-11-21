import type { AuthUser } from './user-content.types';

export type { AuthUser };

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
