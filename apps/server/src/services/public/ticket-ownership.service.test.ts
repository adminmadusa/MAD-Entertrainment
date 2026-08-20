import crypto from 'crypto';
import qrcode from 'qrcode';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { BookingStatus } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import {
  canRenderAttendeePDFQR,
  canRenderPurchaserPDFQR,
  canViewTicketQR,
  generateAuthorizedTicketQR,
  generateTicketQrToken,
  getPurchaserPDFTicketState,
  verifyTicketQrToken,
} from './ticket-ownership.service';

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('./booking.service', () => ({
  PublicBookingService: {
    assertBookingAccess: vi.fn(),
  },
}));

describe('Ticket Ownership Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAuthorizedTicketQR', () => {
    it('successfully returns PNG buffer for a valid ticket and confirmed booking with valid token', async () => {
      const mockTicket = {
        ticketId: 'TKT-MAD-2026-ABCDE-001',
        qrCode: 'validation_hash_123',
        bookingId: 'booking123',
        status: 'active',
      };
      const mockBooking = {
        _id: 'booking123',
        status: BookingStatus.CONFIRMED,
      };
      const mockBuffer = Buffer.from('mocked_png_binary_data');

      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTicket),
      } as any);
      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(qrcode.toBuffer).mockResolvedValue(mockBuffer as any);

      const validToken = generateTicketQrToken('TKT-MAD-2026-ABCDE-001');
      const result = await generateAuthorizedTicketQR('TKT-MAD-2026-ABCDE-001', { token: validToken });

      expect(result).toBe(mockBuffer);
      expect(Ticket.findOne).toHaveBeenCalledWith({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
      expect(Booking.findById).toHaveBeenCalledWith('booking123');
      expect(qrcode.toBuffer).toHaveBeenCalledWith('validation_hash_123', {
        type: 'png',
        margin: 1,
        width: 300,
      });
    });

    it('throws badRequest if ticketId is empty', async () => {
      await expect(generateAuthorizedTicketQR('', {})).rejects.toThrow(AppError);
    });

    it('throws notFound if ticket does not exist', async () => {
      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(generateAuthorizedTicketQR('TKT-NON-EXISTENT', {})).rejects.toThrow(AppError);
    });

    it('throws forbidden if ticket is not active', async () => {
      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ticketId: 't1', status: 'voided' }),
      } as any);

      await expect(generateAuthorizedTicketQR('t1', {})).rejects.toThrow('Ticket is no longer active');
    });

    it('throws notFound if booking does not exist', async () => {
      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ticketId: 't1', status: 'active', bookingId: 'b1' }),
      } as any);
      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(generateAuthorizedTicketQR('t1', {})).rejects.toThrow('Associated booking not found');
    });

    it('throws forbidden if booking is not confirmed', async () => {
      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ticketId: 't1', status: 'active', bookingId: 'b1' }),
      } as any);
      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'b1', status: BookingStatus.PENDING }),
      } as any);

      await expect(generateAuthorizedTicketQR('t1', {})).rejects.toThrow('Associated booking is not confirmed');
    });

    it('throws forbidden if user does not have permission to view QR', async () => {
      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ticketId: 't1', status: 'active', bookingId: 'b1', assignmentStatus: 'unassigned' }),
      } as any);
      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'b1', status: BookingStatus.CONFIRMED, userId: 'other_user' }),
      } as any);
      const { PublicBookingService } = await import('./booking.service');
      vi.mocked(PublicBookingService.assertBookingAccess).mockImplementation(() => {
        throw AppError.forbidden('Unauthorized');
      });

      await expect(generateAuthorizedTicketQR('t1', { userId: 'unauthorized_user' })).rejects.toThrow(
        'You do not have permission to view this QR code'
      );
    });
  });

  describe('PDF QR Helpers', () => {
    it('canRenderPurchaserPDFQR returns true only for unassigned tickets', () => {
      expect(canRenderPurchaserPDFQR({ assignmentStatus: 'unassigned' })).toBe(true);
      expect(canRenderPurchaserPDFQR({ assignmentStatus: 'pending' })).toBe(false);
      expect(canRenderPurchaserPDFQR({ assignmentStatus: 'claimed' })).toBe(false);
    });

    it('canRenderAttendeePDFQR returns true only for claimed tickets belonging to the user', () => {
      expect(canRenderAttendeePDFQR({ assignmentStatus: 'claimed', attendeeUserId: 'u1' }, 'u1')).toBe(true);
      expect(canRenderAttendeePDFQR({ assignmentStatus: 'claimed', attendeeUserId: 'u1' }, 'u2')).toBe(false);
      expect(canRenderAttendeePDFQR({ assignmentStatus: 'unassigned' }, 'u1')).toBe(false);
    });

    it('getPurchaserPDFTicketState returns appropriate states', () => {
      expect(getPurchaserPDFTicketState({ assignmentStatus: 'unassigned' })).toEqual({ canRenderQR: true });
      expect(getPurchaserPDFTicketState({ assignmentStatus: 'pending' }).canRenderQR).toBe(false);
      expect(getPurchaserPDFTicketState({ assignmentStatus: 'claimed' }).canRenderQR).toBe(false);
    });
  });
});
