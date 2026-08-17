import { Request, Response, NextFunction } from 'express';

import * as bookingService from '../../services/admin/booking.service';
import * as refundService from '../../services/admin/refund.service';

/**
 * Fetch paginated list of bookings with optional search and status filters.
 */
export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const eventId = req.query.eventId as string | undefined;
    const sortField = req.query.sortField as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

    const result = await bookingService.getBookings(page, limit, search, status, eventId, sortField, sortOrder);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Bookings fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve detailed populated booking DTO representation.
 */
export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle booking cancellation and capacity/seat releases.
 */
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason, refundAmount, ticketIds } = req.body;
    // PRICING-003: Extract verified admin identity for scan-protection RBAC and audit trail
    const actor = { id: req.admin?.sub || 'system', role: req.admin?.role || 'unknown' };

    if (refundAmount && Number(refundAmount) > 0) {
      const booking = await bookingService.getBookingById(req.params.id) as any;
      if (!booking || !booking.paymentId) {
        return res.status(400).json({ success: false, message: 'Cannot request refund for booking without payment' });
      }

      const refund = await refundService.createRefund({
        bookingId: req.params.id,
        paymentId: booking.paymentId.toString(),
        amount: Number(refundAmount),
        reason,
        origin: 'manual',
        cancelTickets: true,
        ticketIds,
      });

      return res.status(201).json({
        success: true,
        data: refund,
        message: 'Refund requested successfully. Tickets will be cancelled upon refund approval.',
      });
    }

    const booking = await bookingService.cancelBooking(req.params.id, reason, undefined, undefined, actor);
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Administrative method to correct a guest booking's email address.
 */
export const correctBookingEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newEmail, reason } = req.body;
    const adminId = req.admin?.sub || 'system';

    const booking = await bookingService.correctBookingEmail(
      req.params.id,
      newEmail,
      reason,
      adminId
    );

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking email corrected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Administrative method to resend tickets for a confirmed booking.
 */
export const resendBookingTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = req.admin?.sub || 'system';

    const booking = await bookingService.resendBookingTickets(req.params.id, adminId);

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Tickets resent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve booking summary statistics, optionally filtered by event.
 */
export const getBookingsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.query.eventId as string | undefined;

    const summary = await bookingService.getBookingsSummary(eventId);
    res.status(200).json({
      success: true,
      data: summary,
      message: 'Bookings summary fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};
