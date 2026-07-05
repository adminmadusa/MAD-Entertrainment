import crypto from 'crypto';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env configuration
vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    CLOUDINARY_CLOUD_NAME: 'test_cloud',
    CLOUDINARY_API_KEY: 'test_key',
    CLOUDINARY_API_SECRET: 'test_secret',
  })),
}));

const { mockUploadStream, mockDestroy } = vi.hoisted(() => ({
  mockUploadStream: vi.fn(),
  mockDestroy: vi.fn(),
}));

vi.mock('../../config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: mockUploadStream,
      destroy: mockDestroy,
    },
  },
}));

import { AppError } from '../../middleware/error.middleware';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImageBuffer', () => {
    it('successfully uploads image buffer and computes correct SHA-256 hash', async () => {
      const buffer = Buffer.from('test image data');
      const expectedHash = crypto.createHash('sha256').update(buffer).digest('hex');

      mockUploadStream.mockImplementation((options, callback) => {
        return {
          end: vi.fn((buf) => {
            expect(buf).toEqual(buffer);
            callback(null, {
              secure_url: 'https://cloudinary.com/test-image.webp',
              public_id: `mad-entertrainment/${options.folder}/${options.public_id}`,
            });
          }),
        };
      });

      const result = await UploadService.uploadImageBuffer(buffer, 'image-name', 'events');

      expect(result.url).toBe('https://cloudinary.com/test-image.webp');
      expect(result.hash).toBe(expectedHash);
      expect(mockUploadStream).toHaveBeenCalledWith(
        {
          folder: 'mad-entertrainment/events',
          public_id: 'image-name',
          format: 'webp',
          resource_type: 'image',
        },
        expect.any(Function)
      );
    });

    it('returns the same hash for the same file uploaded twice', async () => {
      const buffer = Buffer.from('identical file data');
      const hash1 = crypto.createHash('sha256').update(buffer).digest('hex');

      mockUploadStream.mockImplementation((options, callback) => {
        return {
          end: vi.fn(() => {
            callback(null, {
              secure_url: 'https://cloudinary.com/img.webp',
              public_id: 'img1',
            });
          }),
        };
      });

      const result1 = await UploadService.uploadImageBuffer(buffer, 'file-a');
      const result2 = await UploadService.uploadImageBuffer(buffer, 'file-b');

      expect(result1.hash).toBe(hash1);
      expect(result2.hash).toBe(hash1);
      expect(result1.hash).toBe(result2.hash);
    });

    it('returns different hashes for different files uploaded with the same filename', async () => {
      const bufferA = Buffer.from('file data A');
      const bufferB = Buffer.from('file data B');

      mockUploadStream.mockImplementation((options, callback) => {
        return {
          end: vi.fn(() => {
            callback(null, {
              secure_url: 'https://cloudinary.com/img.webp',
              public_id: 'img1',
            });
          }),
        };
      });

      const result1 = await UploadService.uploadImageBuffer(bufferA, 'common-name');
      const result2 = await UploadService.uploadImageBuffer(bufferB, 'common-name');

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('returns different hashes for different files with the same size', async () => {
      const bufferA = Buffer.from('file 1'); // 6 bytes
      const bufferB = Buffer.from('file 2'); // 6 bytes

      mockUploadStream.mockImplementation((options, callback) => {
        return {
          end: vi.fn(() => {
            callback(null, {
              secure_url: 'https://cloudinary.com/img.webp',
              public_id: 'img1',
            });
          }),
        };
      });

      const result1 = await UploadService.uploadImageBuffer(bufferA, 'name-1');
      const result2 = await UploadService.uploadImageBuffer(bufferB, 'name-2');

      expect(bufferA.length).toBe(bufferB.length);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('throws AppError if Cloudinary upload fails', async () => {
      const buffer = Buffer.from('test data');

      mockUploadStream.mockImplementation((options, callback) => {
        return {
          end: vi.fn(() => {
            callback(new Error('Upload error message'), null);
          }),
        };
      });

      await expect(
        UploadService.uploadImageBuffer(buffer, 'err-img')
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteImage', () => {
    it('successfully deletes image from Cloudinary', async () => {
      mockDestroy.mockImplementation((publicId, callback) => {
        expect(publicId).toBe('test-public-id');
        callback(null, { result: 'ok' });
      });

      await expect(UploadService.deleteImage('test-public-id')).resolves.not.toThrow();
    });

    it('successfully resolves if image is already deleted (not found)', async () => {
      mockDestroy.mockImplementation((publicId, callback) => {
        callback(null, { result: 'not found' });
      });

      await expect(UploadService.deleteImage('test-public-id')).resolves.not.toThrow();
    });

    it('throws AppError if Cloudinary deletion fails', async () => {
      mockDestroy.mockImplementation((publicId, callback) => {
        callback(new Error('Delete error message'), null);
      });

      await expect(UploadService.deleteImage('test-public-id')).rejects.toThrow(AppError);
    });

    it('throws AppError if Cloudinary returns failure result', async () => {
      mockDestroy.mockImplementation((publicId, callback) => {
        callback(null, { result: 'server_error' });
      });

      await expect(UploadService.deleteImage('test-public-id')).rejects.toThrow(AppError);
    });
  });
});
