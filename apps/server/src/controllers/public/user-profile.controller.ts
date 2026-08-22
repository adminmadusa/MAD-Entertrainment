import { Request, Response } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { UserModel } from '../../models/user.schema';
import { UploadService } from '../../services/admin/upload.service';
import { clearXsrfCookie } from '../../utils/cookie';
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
    if (!userId) throw AppError.unauthorized('Authentication required');

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is deactivated or does not exist');

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobileNumber: user.mobileNumber ?? '',
        phone: user.mobileNumber ?? '',
        picture: user.picture,
        isEmailVerified: !!user.isEmailVerified,
        isGuest: false,
        onboardingRequired: requiresOnboarding(user),
      },
    });
  }

  /**
   * Updates the authenticated user's profile details safely.
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) throw AppError.unauthorized('Authentication required');

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is deactivated or does not exist');

    const { firstName, lastName, mobileNumber } = req.body;
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.mobileNumber = (mobileNumber && mobileNumber.trim() !== '') ? mobileNumber.trim() : undefined;
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
        phone: user.mobileNumber ?? '',
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
    if (!userId) throw AppError.unauthorized('Authentication required');

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is deactivated or does not exist');

    if (!req.file) throw AppError.badRequest('No image file provided');
    const { originalname, buffer, mimetype } = req.file;

    validateFilenameAndExtension(originalname);
    validateMagicBytes(buffer, mimetype);

    if (user.picture) {
      const oldPublicId = extractCloudinaryPublicId(user.picture);
      if (oldPublicId) {
        try { await UploadService.deleteImage(oldPublicId); } catch (err) {
          logger.error(`Failed to delete old profile photo: ${err}`);
        }
      }
    }

    const secureFilename = generateSecureFilename();
    const result = await UploadService.uploadImageBuffer(buffer, secureFilename, 'profile-photos');
    user.picture = result.url;
    await user.save();

    res.status(200).json({ success: true, data: { picture: user.picture } });
  }

  /**
   * Deletes the authenticated user's profile photo.
   */
  static async deleteProfilePhoto(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) throw AppError.unauthorized('Authentication required');

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is deactivated or does not exist');

    if (user.picture) {
      const oldPublicId = extractCloudinaryPublicId(user.picture);
      if (oldPublicId) await UploadService.deleteImage(oldPublicId);
      user.picture = undefined;
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Profile photo deleted successfully' });
  }

  /**
   * Permanently deletes the authenticated user's account and clears session cookies.
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) throw AppError.unauthorized('Authentication required');

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is deactivated or does not exist');

    const { confirmation } = req.body;
    const confirmVal = confirmation?.trim().toLowerCase();
    if (confirmVal !== 'delete' && confirmVal !== user.email.trim().toLowerCase()) {
      throw AppError.badRequest('Please type "DELETE" or your email address to confirm account deletion');
    }

    if (user.picture) {
      const oldPublicId = extractCloudinaryPublicId(user.picture);
      if (oldPublicId) {
        try { await UploadService.deleteImage(oldPublicId); } catch (e) {
          logger.error(`Failed to delete profile photo on account delete: ${e}`);
        }
      }
    }

    user.isActive = false;
    user.isEmailVerified = false;
    user.name = 'Deleted User';
    user.firstName = 'Deleted';
    user.lastName = 'User';
    user.mobileNumber = undefined;
    user.picture = undefined;
    user.googleId = undefined;
    user.email = `deleted_${user._id}_${Date.now()}@deleted.madentertainments.net`;
    await user.save();

    res.clearCookie('refreshToken');
    clearXsrfCookie(res);

    logger.info({ userId }, 'User account permanently deleted and anonymized');
    res.status(200).json({ success: true, message: 'Your account has been permanently deleted.' });
  }
}
