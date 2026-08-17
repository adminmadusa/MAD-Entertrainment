import { describe, it, expect, vi } from 'vitest';
import { validateFilenameAndExtension, validateMagicBytes } from './file-security';

vi.mock('../config/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'super-secret-jwt-key-for-users-12345',
    JWT_ADMIN_SECRET: 'super-secret-jwt-key-for-admin-12345',
    JWT_SESSION_SECRET: 'super-secret-jwt-key-for-session-12345',
  }),
}));

describe('file-security utilities', () => {
  describe('validateFilenameAndExtension', () => {
    it('accepts valid standard image names', () => {
      expect(validateFilenameAndExtension('photo.jpg')).toBe(true);
      expect(validateFilenameAndExtension('photo.jpeg')).toBe(true);
      expect(validateFilenameAndExtension('image.png')).toBe(true);
      expect(validateFilenameAndExtension('banner.webp')).toBe(true);
    });

    it('accepts filenames with multiple dots (timestamps, screenshots, periods)', () => {
      expect(validateFilenameAndExtension('Screenshot 2026-08-17 at 5.43.20 PM.png')).toBe(true);
      expect(validateFilenameAndExtension('IMG_2026.08.17_12.30.jpg')).toBe(true);
      expect(validateFilenameAndExtension('event.recap.final.webp')).toBe(true);
      expect(validateFilenameAndExtension('coffee.beans.png')).toBe(true);
    });

    it('rejects filenames with null bytes', () => {
      expect(() => validateFilenameAndExtension('photo\0.jpg')).toThrow('Contains null bytes');
    });

    it('rejects directory traversal characters', () => {
      expect(() => validateFilenameAndExtension('../photo.jpg')).toThrow('directory traversal');
      expect(() => validateFilenameAndExtension('/etc/passwd.jpg')).toThrow('directory traversal');
    });

    it('rejects dangerous executable extensions disguised as images', () => {
      expect(() => validateFilenameAndExtension('exploit.php.png')).toThrow('Executable extensions are not allowed');
      expect(() => validateFilenameAndExtension('malware.exe.jpg')).toThrow('Executable extensions are not allowed');
      expect(() => validateFilenameAndExtension('script.sh.webp')).toThrow('Executable extensions are not allowed');
      expect(() => validateFilenameAndExtension('payload.js.png')).toThrow('Executable extensions are not allowed');
    });

    it('rejects disallowed file extensions', () => {
      expect(() => validateFilenameAndExtension('document.pdf')).toThrow('Invalid extension');
      expect(() => validateFilenameAndExtension('archive.zip')).toThrow('Invalid extension');
      expect(() => validateFilenameAndExtension('script.exe')).toThrow('Invalid extension');
    });
  });

  describe('validateMagicBytes', () => {
    it('validates JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(validateMagicBytes(jpegBuffer, 'image/jpeg')).toBe(true);
      expect(validateMagicBytes(jpegBuffer, 'image/jpg')).toBe(true);
    });

    it('validates PNG magic bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      expect(validateMagicBytes(pngBuffer, 'image/png')).toBe(true);
    });

    it('validates WEBP magic bytes', () => {
      const webpHeader = Buffer.from('RIFF....WEBP', 'ascii');
      const webpBuffer = Buffer.concat([webpHeader, Buffer.alloc(10)]);
      expect(validateMagicBytes(webpBuffer, 'image/webp')).toBe(true);
    });

    it('rejects mismatching signatures', () => {
      const fakePng = Buffer.from('NOT_A_PNG_FILE_CONTENT');
      expect(() => validateMagicBytes(fakePng, 'image/png')).toThrow('signature does not match');
    });
  });
});
