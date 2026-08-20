import { Types } from 'mongoose';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { logger } from '../../utils/logger';

export class AuthHydrationService {
  /**
   * Scans bookings and automatically links unmatched guest bookings and assigned tickets to the user profile safely.
   */
  static async linkBookingsToUser(email: string, userId: string): Promise<void> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await Booking.updateMany(
        {
          guestEmail: normalizedEmail,
          $or: [{ userId: { $exists: false } }, { userId: null }],
        },
        {
          $set: { userId: new Types.ObjectId(userId) },
        }
      );
      if (result.modifiedCount > 0) {
        logger.info(
          { email: normalizedEmail, userId, count: result.modifiedCount },
          'Linked historical bookings to newly logged in user account.'
        );
      }

      const ticketResult = await Ticket.updateMany(
        {
          attendeeEmail: normalizedEmail,
          $or: [{ attendeeUserId: { $exists: false } }, { attendeeUserId: null }],
        },
        {
          $set: {
            attendeeUserId: new Types.ObjectId(userId),
            assignmentStatus: 'claimed',
            claimedAt: new Date(),
          },
        }
      );
      if (ticketResult.modifiedCount > 0) {
        logger.info(
          { email: normalizedEmail, userId, count: ticketResult.modifiedCount },
          'Linked assigned tickets to newly logged in user account.'
        );
      }
    } catch (err) {
      logger.error({ err, email, userId }, 'Failed to link historical guest bookings or tickets.');
    }
  }

  /**
   * Safe profile hydration from historical guest bookings.
   */
  static async hydrateUserProfile(userId: string, email: string): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user || !user.isActive) return;

      const needsFirstName = !user.firstName || user.firstName.trim() === '';
      const needsLastName = !user.lastName || user.lastName.trim() === '';
      const needsMobile = !user.mobileNumber || user.mobileNumber.trim() === '';

      if (!needsFirstName && !needsLastName && !needsMobile) {
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      let sourceBooking = await Booking.findOne({
        guestEmail: normalizedEmail,
        status: 'confirmed',
        $or: [
          { firstName: { $ne: null, $gt: '' } },
          { lastName: { $ne: null, $gt: '' } },
          { guestPhone: { $ne: null, $gt: '' } },
        ],
      }).sort({ createdAt: -1 });

      if (!sourceBooking) {
        sourceBooking = await Booking.findOne({
          guestEmail: normalizedEmail,
          $or: [
            { firstName: { $ne: null, $gt: '' } },
            { lastName: { $ne: null, $gt: '' } },
            { guestPhone: { $ne: null, $gt: '' } },
          ],
        }).sort({ createdAt: -1 });
      }

      if (!sourceBooking) return;

      let isModified = false;

      if (needsFirstName && sourceBooking.firstName && sourceBooking.firstName.trim() !== '') {
        user.firstName = sourceBooking.firstName.trim();
        isModified = true;
      }

      if (needsLastName && sourceBooking.lastName && sourceBooking.lastName.trim() !== '') {
        user.lastName = sourceBooking.lastName.trim();
        isModified = true;
      }

      if (needsMobile && sourceBooking.guestPhone && sourceBooking.guestPhone.trim() !== '') {
        user.mobileNumber = sourceBooking.guestPhone.trim();
        isModified = true;
      }

      if (isModified && (!user.name || user.name.trim() === '')) {
        user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      if (isModified) {
        await user.save();
        logger.info(
          { userId, email: normalizedEmail },
          'User profile safely hydrated from historical booking details.'
        );
      }
    } catch (err) {
      logger.error({ err, userId, email }, 'Failed to hydrate user profile from guest bookings.');
    }
  }
}
