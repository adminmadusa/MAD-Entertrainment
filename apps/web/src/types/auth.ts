export interface AuthUser {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;

  firstName?: string;
  lastName?: string;
  phone?: string;
  mobileNumber?: string;

  isGuest: boolean;
}

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
