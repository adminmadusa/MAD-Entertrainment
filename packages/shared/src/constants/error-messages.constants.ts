// ============================================================
// MAD Entertrainment — Shared Validation & Error Messages SSOT
// ============================================================

export const AUTH_ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PASSCODE: 'Passcode must be 6 digits',
  PASSCODE_REQUIRED: 'Passcode is required',
  EMAIL_TOO_LONG: 'Email is too long',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
  PASSWORD_MAX_LENGTH: 'Password cannot exceed 128 characters',
  PASSWORD_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_LOWERCASE: 'Password must contain at least one lowercase letter',
  PASSWORD_NUMBER: 'Password must contain at least one number',
  PASSWORD_SPECIAL: 'Password must contain at least one special character',
  INVALID_PHONE: 'Mobile number must be in valid E.164 format (e.g. +14155552671)',
} as const;

export const BOOKING_ERROR_MESSAGES = {
  INVALID_REFERENCE: 'Invalid booking reference format (expected MAD-YYYY-XXXXX)',
  GLOBAL_SEARCH_PROMPT: 'Please enter a valid Booking Reference (MAD-YYYY-XXXXX) or Customer Email.',
  REASON_LENGTH: 'Reason must be between 5 and 500 characters.',
} as const;

export const VALIDATION_ERROR_MESSAGES = {
  INVALID_OBJECT_ID: 'Invalid Mongoose ObjectId identifier',
  INVALID_HEX_COLOR: 'Invalid hex color format',
  INVALID_EVENT_ID: 'Invalid event ID format',
} as const;
