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

export interface MagicLinkPayload {
  email: string;
}

export interface VerifyMagicLinkOrOTPPayload {
  token?: string;
  otp?: string;
  email?: string;
}

export interface MagicLinkRequestResponse {
  success: boolean;
  message: string;
}
