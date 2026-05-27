import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";

const env = getEnv();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class UploadService {
  /**
   * Uploads a memory buffer directly to Cloudinary using a stream.
   * This is highly secure as the file never touches the local disk.
   */
  static async uploadImageBuffer(
    buffer: Buffer,
    secureFilename: string,
    folderPath: string = "general",
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mad-entertrainment/${folderPath}`,
          public_id: secureFilename,
          // Hard-enforce formatting on Cloudinary's side as a second layer of defense
          format: "webp",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(
              new AppError(`Cloudinary upload failed: ${error.message}`, 500),
            );
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new AppError("Cloudinary upload returned null", 500));
          }
        },
      );

      // Write the buffer to the stream and end it
      uploadStream.end(buffer);
    });
  }
}
