import { Request, Response } from 'express';
import { AppError } from '../../middleware/error.middleware';
import { sendSuccess } from '../../utils/response';
import { 
  validateFilenameAndExtension, 
  validateMagicBytes, 
  generateSecureFilename 
} from '../../utils/file-security';
import { UploadService } from '../../services/admin/upload.service';
import { uploadImageQuerySchema } from '@mad/validations';

export const uploadImage = async (req: Request, res: Response) => {
  // 1. Ensure file exists (multer handles parsing it into req.file)
  if (!req.file) {
    throw AppError.badRequest('No image file provided');
  }

  // Parse query params to know which folder to put it in
  const queryResult = uploadImageQuerySchema.safeParse(req.query);
  const folder = queryResult.success ? queryResult.data.folder : 'general';

  const { originalname, buffer, mimetype } = req.file;

  // 2. Security Check: Validate filename and block double extensions
  validateFilenameAndExtension(originalname);

  // 3. Security Check: Validate magic bytes to ensure it's not an executable
  validateMagicBytes(buffer, mimetype);

  // 4. Generate a secure UUID filename to prevent traversal and overwrites
  const secureFilename = generateSecureFilename();

  // 5. Stream securely to Cloudinary
  const result = await UploadService.uploadImageBuffer(buffer, secureFilename, folder);

  sendSuccess(res, result, 'Image uploaded securely');
};

export const deleteUpload = async (req: Request, res: Response) => {
  const { publicId } = req.body;
  await UploadService.deleteImage(publicId);
  sendSuccess(res, null, 'Image deleted securely');
};
