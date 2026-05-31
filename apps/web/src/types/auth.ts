export interface AuthUser {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  isGuest: boolean;
  picture?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
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
