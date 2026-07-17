import crypto from 'crypto';
import path from 'path';

import { UPLOAD_CONSTANTS } from '@mad/validations';

import { AppError } from '../middleware/error.middleware';

/**
 * Validates the file extension to prevent double extensions (e.g. image.php.png)
 * and ensure it is in our allowed list.
 */
export function validateFilenameAndExtension(originalName: string) {
  // Ensure no null bytes
  if (originalName.indexOf('\0') !== -1) {
    throw AppError.badRequest('Invalid filename: Contains null bytes');
  }

  // Ensure no directory traversal
  const basename = path.basename(originalName);
  if (basename !== originalName) {
    throw AppError.badRequest('Invalid filename: Contains directory traversal characters');
  }

  // Count dots to prevent double extensions (e.g., .php.png)
  const dotCount = (basename.match(/\./g) || []).length;
  if (dotCount > 1) {
    throw AppError.badRequest('Invalid filename: Multiple extensions are not allowed');
  }

  const ext = path.extname(basename).toLowerCase();
  if (!UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.includes(ext as any)) {
    throw AppError.badRequest(`Invalid extension: ${ext}. Allowed: ${UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}`);
  }

  return true;
}

/**
 * Checks the magic bytes of the buffer to verify the actual file content matches the claimed image type.
 * This prevents users from uploading executable scripts disguised as images.
 */
export function validateMagicBytes(buffer: Buffer, mimetype: string) {
  // We need at least 12 bytes to check WEBP
  if (!buffer || buffer.length < 12) {
    throw AppError.badRequest('File is too small or empty');
  }

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WEBP: starts with RIFF, 8-11 is WEBP
  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (mimetype === 'image/jpeg' && !isJpeg) {
    throw AppError.badRequest('File signature does not match image/jpeg');
  }
  if (mimetype === 'image/png' && !isPng) {
    throw AppError.badRequest('File signature does not match image/png');
  }
  if (mimetype === 'image/webp' && !isWebp) {
    throw AppError.badRequest('File signature does not match image/webp');
  }

  if (!isJpeg && !isPng && !isWebp) {
    throw AppError.badRequest('File signature is not a recognized valid image format');
  }

  return true;
}

/**
 * Generates a completely secure, random UUID filename to prevent
 * path traversal, overwrites, or execution based on filename guessing.
 */
export function generateSecureFilename() {
  return crypto.randomUUID();
}

/**
 * Extracts the Cloudinary public ID from a full secure URL.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
  return match ? match[1] : null;
}
