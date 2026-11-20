// ============================================================
// MAD Entertrainment — Shared Regex Patterns SSOT
// ============================================================

/**
 * Standard booking reference pattern: MAD-YYYY-XXXXX
 * Example: MAD-2026-AB12C
 */
export const BOOKING_REFERENCE_REGEX = /^MAD-\d{4}-[A-Z0-9]{5}$/;

/**
 * Standard RFC 5322 compliant email regex for client & utility checks.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standard 3 or 6 digit hex color code (with leading #).
 * Example: #FFF, #1A2B3C
 */
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * MongoDB 24-character hex ObjectId pattern.
 */
export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * International E.164 phone number format (e.g. +14155552671).
 */
export const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * 6-digit numeric passcode / OTP format.
 */
export const OTP_CODE_REGEX = /^\d{6}$/;

/**
 * Password complexity constituent patterns.
 */
export const PASSWORD_PATTERNS = {
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /[0-9]/,
  SPECIAL: /[^A-Za-z0-9]/,
} as const;
