import multer from 'multer';

import { UPLOAD_CONSTANTS } from '@mad/validations';

import { AppError } from './error.middleware';

// We use memory storage because we want to pass the buffer directly
// to Cloudinary without writing to the local disk, improving performance
// and security (no temporary files to clean up).
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES,
    // Limit to 1 file per request to prevent abuse
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Check mime type BEFORE the file is fully downloaded to memory
    if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      return cb(AppError.badRequest(`Invalid file type. Allowed: ${UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.join(', ')}`));
    }
    cb(null, true);
  },
});
