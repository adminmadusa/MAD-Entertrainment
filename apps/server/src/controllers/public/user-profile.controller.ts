import { Request, Response } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { UserModel } from '../../models/user.schema';
import { UploadService } from '../../services/admin/upload.service';
import {
  validateFilenameAndExtension,
  validateMagicBytes,
  generateSecureFilename,
  extractCloudinaryPublicId,
} from '../../utils/file-security';
import { logger } from '../../utils/logger';
import { requiresOnboarding } from '../../utils/user';

export class UserProfileController {
  /**
   * Fetches the current logged in user details.
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    const onboardingRequired = requiresOnboarding(user);

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobileNumber: user.mobileNumber ?? '',
        phone: user.mobileNumber ?? '', // Alias response-only
        picture: user.picture,
        isGuest: false,
        onboardingRequired,
      },
    });
  }

  /**
   * Updates the authenticated user's profile details safely.
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    // Immutable Field Handling. Only process allowed fields.
    const { firstName, lastName, mobileNumber } = req.body;

    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.mobileNumber = (mobileNumber && mobileNumber.trim() !== '') ? mobileNumber.trim() : undefined;

    // Recalculate dynamic concatenated name from profile fields programmatically
    user.name = `${user.firstName} ${user.lastName}`.trim();

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobileNumber: user.mobileNumber ?? '',
        phone: user.mobileNumber ?? '', // Alias response-only
        picture: user.picture,
        isGuest: false,
      },
    });
  }

  /**
   * Uploads and updates the authenticated user's profile photo.
   */
  static async uploadProfilePhoto(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    if (!req.file) {
      throw AppError.badRequest('No image file provided');
    }

    const { originalname, buffer, mimetype } = req.file;

    // Security check: filename & magic bytes validation
    validateFilenameAndExtension(originalname);
    validateMagicBytes(buffer, mimetype);

    // Delete old profile picture if present
    if (user.picture) {
      const oldPublicId = extractCloudinaryPublicId(user.picture);
      if (oldPublicId) {
        try {
          await UploadService.deleteImage(oldPublicId);
        } catch (err) {
          logger.error(`Failed to delete old profile photo: ${err}`);
        }
      }
    }

    // Generate secure filename and upload
    const secureFilename = generateSecureFilename();
    const result = await UploadService.uploadImageBuffer(buffer, secureFilename, 'profile-photos');

    user.picture = result.url;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        picture: user.picture,
      },
    });
  }

  /**
   * Deletes the authenticated user's profile photo.
   */
  static async deleteProfilePhoto(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    if (user.picture) {
      const oldPublicId = extractCloudinaryPublicId(user.picture);
      if (oldPublicId) {
        await UploadService.deleteImage(oldPublicId);
      }
      user.picture = undefined;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  }
}
