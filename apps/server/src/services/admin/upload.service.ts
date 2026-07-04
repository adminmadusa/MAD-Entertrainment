import crypto from 'crypto';
import { cloudinary } from '../../config/cloudinary';
import { AppError } from '../../middleware/error.middleware';

export class UploadService {
  /**
   * Uploads a memory buffer directly to Cloudinary using a stream.
   * This is highly secure as the file never touches the local disk.
   */
  static async uploadImageBuffer(
    buffer: Buffer,
    secureFilename: string,
    folderPath: string = 'general'
  ): Promise<{ url: string; publicId: string; hash: string }> {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mad-entertrainment/${folderPath}`,
          public_id: secureFilename,
          // Hard-enforce formatting on Cloudinary's side as a second layer of defense
          format: 'webp',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              hash,
            });
          } else {
            reject(new AppError('Cloudinary upload returned null', 500));
          }
        }
      );

      // Write the buffer to the stream and end it
      uploadStream.end(buffer);
    });
  }

  /**
   * Deletes an image from Cloudinary using its public ID.
   */
  static async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(new AppError(`Cloudinary deletion failed: ${error.message}`, 500));
        } else if (result) {
          if (result.result !== 'ok' && result.result !== 'not found') {
            reject(new AppError(`Cloudinary deletion failed with result: ${result.result}`, 500));
          } else {
            resolve();
          }
        } else {
          reject(new AppError('Cloudinary deletion returned null', 500));
        }
      });
    });
  }
}
