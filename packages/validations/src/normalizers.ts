export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const normalizePhone = (phone: string): string =>
  phone.trim().replace(/[\s\-\(\)]/g, '');

export const normalizeName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ');

export const normalizeOtp = (otp: string): string =>
  otp.trim().replace(/\D/g, '').slice(0, 6);
