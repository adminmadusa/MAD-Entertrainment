import { Types } from 'mongoose';
import { UserModel } from '../../models/user.schema';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { Refund } from '../../models/refund.schema';
import { Payment } from '../../models/payment.schema';
import { PaymentStatus } from '@mad/shared';
import { AppError } from '../../middleware/error.middleware';
import { auditLog } from '../../utils/audit';

export class AdminUserService {
  /**
   * Fetches a paginated list of customers (registered accounts or guest purchasers)
   */
  static async listUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    type: 'registered' | 'guest' = 'registered',
    sortField?: 'name' | 'email' | 'createdAt' | 'lastLogin',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;

    if (type === 'registered') {
      const matchStage: any = {};
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        matchStage.$or = [
          { email: searchRegex },
          { name: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { mobileNumber: searchRegex },
        ];
      }

      // Handle sorting
      const sortStage: any = {};
      const sortCol = sortField || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      sortStage[sortCol] = sortDirection;

      const total = await UserModel.countDocuments(matchStage);
      const users = await UserModel.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'userId',
            as: 'bookings',
          },
        },
        {
          $addFields: {
            totalBookings: { $size: '$bookings' },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            mobileNumber: 1,
            googleId: 1,
            isActive: 1,
            lastLogin: 1,
            totalBookings: 1,
            createdAt: 1,
          },
        },
      ]);

      const items = users.map(user => ({
        id: user._id.toString(),
        name: user.name || '—',
        email: user.email,
        phone: user.mobileNumber || '—',
        accountType: 'registered',
        loginVia: user.googleId ? 'google' : 'otp',
        isActive: user.isActive ?? true,
        lastLogin: user.lastLogin || null,
        totalBookings: user.totalBookings,
        createdAt: user.createdAt,
      }));

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      // Guest users (unique guest emails in Booking where userId is empty/null)
      const matchStage: any = {
        $or: [
          { userId: { $exists: false } },
          { userId: null },
        ],
        guestEmail: { $nin: [null, ''] },
      };

      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        matchStage.$or = [
          { guestEmail: searchRegex },
          { guestName: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { guestPhone: searchRegex },
        ];
      }

      // Get total count of unique guest emails
      const countResult = await Booking.aggregate([
        { $match: matchStage },
        { $group: { _id: '$guestEmail' } },
        { $count: 'total' },
      ]);
      const total = countResult[0]?.total || 0;

      // Group unique guest emails, sorted by newest booking details first
      const sortCol = sortField || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;

      // Pipeline matching, grouping, sorting and paginating
      const guests = await Booking.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } }, // Sort bookings descending so we group newest details
        {
          $group: {
            _id: '$guestEmail',
            guestName: { $first: '$guestName' },
            firstName: { $first: '$firstName' },
            lastName: { $first: '$lastName' },
            guestPhone: { $first: '$guestPhone' },
            totalBookings: { $sum: 1 },
            createdAt: { $min: '$createdAt' }, // First booking date
          },
        },
        // Sort the grouped results
        {
          $sort: {
            [sortCol === 'name' ? 'guestName' : sortCol === 'email' ? '_id' : sortCol]: sortDirection,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]);

      const items = guests.map(guest => {
        let name = guest.guestName;
        if (!name && (guest.firstName || guest.lastName)) {
          name = `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
        }
        return {
          id: null, // Guests don't have user IDs
          name: name || '—',
          email: guest._id,
          phone: guest.guestPhone || '—',
          accountType: 'guest',
          totalBookings: guest.totalBookings,
          createdAt: guest.createdAt,
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * Fetches detailed profile of a registered user
   */
  static async getRegisteredUserDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid user ID format');
    }

    const user = await UserModel.findById(id).lean();
    if (!user) {
      return null;
    }

    // Retrieve all bookings placed by this user
    const bookings = await Booking.find({ userId: user._id })
      .populate('eventId', 'title startDate')
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map(b => b._id);

    // Fetch associated tickets & refunds
    const tickets = await Ticket.find({ bookingId: { $in: bookingIds } }).lean();
    const refunds = await Refund.find({ bookingId: { $in: bookingIds } }).lean();

    // Map bookings to contain ticket lists and refund info
    const bookingsMapped = bookings.map(b => {
      const bookingTickets = tickets.filter(t => t.bookingId.toString() === b._id.toString());
      const bookingRefunds = refunds.filter(r => r.bookingId.toString() === b._id.toString());
      
      const ticketsScanned = bookingTickets.filter(t => !!t.scannedAt).reduce((sum, t) => sum + (t.admits || 1), 0);
      const totalTicketsCount = bookingTickets.reduce((sum, t) => sum + (t.admits || 1), 0);

      return {
        _id: b._id.toString(),
        bookingId: b.bookingId,
        eventId: b.eventId ? {
          _id: (b.eventId as any)._id.toString(),
          title: (b.eventId as any).title,
          startDate: (b.eventId as any).startDate,
        } : null,
        status: b.status,
        purchaseDate: b.createdAt,
        ticketCount: b.totalTickets,
        totalAmount: b.totalAmount,
        currency: b.currency || 'INR',
        tickets: bookingTickets.map(t => ({
          ticketId: t.ticketId,
          tierName: t.tierName,
          admits: t.admits,
          seatInfo: t.seatId ? { row: t.row, number: t.seatNumber, section: t.section } : null,
          scannedAt: t.scannedAt || null,
        })),
        ticketsScanned,
        ticketsRemaining: Math.max(0, totalTicketsCount - ticketsScanned),
        refunds: bookingRefunds.map(r => ({
          refundId: r._id.toString(),
          amount: r.amount,
          currency: r.currency || 'INR',
          reason: r.reason || '',
          status: r.status,
          processedAt: r.processedAt || null,
        })),
      };
    });

    // Compute aggregated totals using Payments and Refunds
    const payments = await Payment.find({
      bookingId: { $in: bookingIds },
      status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] }
    }).lean();
    const lifetimeGrossSpend = payments.reduce((sum, p) => sum + p.amount, 0);

    const completedRefunds = refunds.filter(r => r.status === 'completed');
    const lifetimeRefunds = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

    const lifetimeNetSpend = lifetimeGrossSpend - lifetimeRefunds;

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const totalTickets = confirmedBookings.reduce((sum, b) => sum + b.totalTickets, 0);

    return {
      profile: {
        id: user._id.toString(),
        name: user.name || '—',
        email: user.email,
        phone: user.mobileNumber || '—',
        accountType: 'registered',
        loginVia: user.googleId ? 'google' : 'otp',
        isActive: user.isActive ?? true,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
        totalBookings: bookings.length,
        totalTickets,
        lifetimeGrossSpend,
        lifetimeRefunds,
        lifetimeNetSpend,
        totalSpend: lifetimeNetSpend, // Compatibility mapping
      },
      bookings: bookingsMapped,
    };
  }

  /**
   * Fetches detailed profile of a guest purchaser
   */
  static async getGuestUserDetail(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    // Fetch all guest bookings matching this email
    const bookings = await Booking.find({
      guestEmail: cleanEmail,
      $or: [
        { userId: { $exists: false } },
        { userId: null },
      ],
    })
      .populate('eventId', 'title startDate')
      .sort({ createdAt: -1 })
      .lean();

    if (bookings.length === 0) {
      return null;
    }

    // Derive guest details from their most recent booking
    const latestBooking = bookings[0];
    let name = latestBooking.guestName;
    if (!name && (latestBooking.firstName || latestBooking.lastName)) {
      name = `${latestBooking.firstName || ''} ${latestBooking.lastName || ''}`.trim();
    }

    const bookingIds = bookings.map(b => b._id);

    // Fetch associated tickets & refunds
    const tickets = await Ticket.find({ bookingId: { $in: bookingIds } }).lean();
    const refunds = await Refund.find({ bookingId: { $in: bookingIds } }).lean();

    const bookingsMapped = bookings.map(b => {
      const bookingTickets = tickets.filter(t => t.bookingId.toString() === b._id.toString());
      const bookingRefunds = refunds.filter(r => r.bookingId.toString() === b._id.toString());

      const ticketsScanned = bookingTickets.filter(t => !!t.scannedAt).reduce((sum, t) => sum + (t.admits || 1), 0);
      const totalTicketsCount = bookingTickets.reduce((sum, t) => sum + (t.admits || 1), 0);

      return {
        _id: b._id.toString(),
        bookingId: b.bookingId,
        eventId: b.eventId ? {
          _id: (b.eventId as any)._id.toString(),
          title: (b.eventId as any).title,
          startDate: (b.eventId as any).startDate,
        } : null,
        status: b.status,
        purchaseDate: b.createdAt,
        ticketCount: b.totalTickets,
        totalAmount: b.totalAmount,
        currency: b.currency || 'INR',
        tickets: bookingTickets.map(t => ({
          ticketId: t.ticketId,
          tierName: t.tierName,
          admits: t.admits,
          seatInfo: t.seatId ? { row: t.row, number: t.seatNumber, section: t.section } : null,
          scannedAt: t.scannedAt || null,
        })),
        ticketsScanned,
        ticketsRemaining: Math.max(0, totalTicketsCount - ticketsScanned),
        refunds: bookingRefunds.map(r => ({
          refundId: r._id.toString(),
          amount: r.amount,
          currency: r.currency || 'INR',
          reason: r.reason || '',
          status: r.status,
          processedAt: r.processedAt || null,
        })),
      };
    });

    // Compute aggregated totals using Payments and Refunds
    const payments = await Payment.find({
      bookingId: { $in: bookingIds },
      status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] }
    }).lean();
    const lifetimeGrossSpend = payments.reduce((sum, p) => sum + p.amount, 0);

    const completedRefunds = refunds.filter(r => r.status === 'completed');
    const lifetimeRefunds = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

    const lifetimeNetSpend = lifetimeGrossSpend - lifetimeRefunds;

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const totalTickets = confirmedBookings.reduce((sum, b) => sum + b.totalTickets, 0);

    return {
      profile: {
        id: null,
        name: name || '—',
        email: cleanEmail,
        phone: latestBooking.guestPhone || '—',
        accountType: 'guest',
        createdAt: bookings[bookings.length - 1].createdAt, // Date of first guest booking
        totalBookings: bookings.length,
        totalTickets,
        lifetimeGrossSpend,
        lifetimeRefunds,
        lifetimeNetSpend,
        totalSpend: lifetimeNetSpend, // Compatibility mapping
      },
      bookings: bookingsMapped,
    };
  }

  /**
   * Toggles the active status of a registered user
   */
  static async toggleUserActive(id: string, requesterId: string) {
    if (id === requesterId) {
      throw AppError.badRequest('Administrators cannot suspend their own account');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid user ID format');
    }

    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Toggle active status
    user.isActive = !user.isActive;
    await user.save();

    // Log the deactivation action
    auditLog({
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actor: { type: 'admin', id: requesterId },
      status: 'success',
      metadata: {
        userId: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
      },
      description: `${user.isActive ? 'Activated' : 'Suspended'} user account ${user.email}`,
    });

    return user;
  }
}
