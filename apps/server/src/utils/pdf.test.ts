import qrcode from 'qrcode';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Ticket } from '../models/ticket.schema';
import { generateTicketPDF } from './pdf';

// Mock Models
vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

// Mock Logger to keep stdout clean
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('PDF Generation Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(qrcode, 'toBuffer');
  });

  const mockBooking = {
    _id: 'booking123',
    bookingId: 'MAD-2026-ABCDE',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
  };
  const mockEvent = {
    title: 'Neon Music Festival',
    startDate: new Date('2026-12-31T16:00:00.000Z'),
    showTime: '18:00',
    venue: 'Phoenix Marketcity, Bangalore',
  };

  describe('Modular PDF Engine — Visibility Matrix', () => {
    it('should fallback to default single ticket in Modular if no tickets found', async () => {
      const mockSort = vi.fn().mockResolvedValue([]);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should render QR code for unassigned ticket', async () => {
      const mockTickets = [
        { ticketId: 'TKT-UNASSIGNED', qrCode: 'QR-MOD-1', assignmentStatus: 'unassigned', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });

      expect(qrcode.toBuffer).toHaveBeenCalledWith('QR-MOD-1', expect.any(Object));
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should hide/mask QR and Ticket ID for pending ticket', async () => {
      const mockTickets = [
        { ticketId: 'TKT-PENDING', qrCode: 'QR-MOD-2', assignmentStatus: 'pending', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });

      expect(qrcode.toBuffer).not.toHaveBeenCalled();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should hide/mask QR and Ticket ID for claimed ticket in purchaser context', async () => {
      const mockTickets = [
        { ticketId: 'TKT-CLAIMED', qrCode: 'QR-MOD-3', assignmentStatus: 'claimed', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });

      expect(qrcode.toBuffer).not.toHaveBeenCalled();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should render QR for claimed ticket in authorized attendee context', async () => {
      const mockTicket = {
        ticketId: 'TKT-CLAIMED',
        qrCode: 'QR-MOD-3',
        assignmentStatus: 'claimed',
        status: 'active',
        attendeeUserId: 'user-123',
      };
      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, {
        role: 'attendee',
        targetTicketId: 'TKT-CLAIMED',
        userId: 'user-123',
      });

      expect(Ticket.findOne).toHaveBeenCalledWith({ ticketId: 'TKT-CLAIMED', status: 'active' });
      expect(qrcode.toBuffer).toHaveBeenCalledWith('QR-MOD-3', expect.any(Object));
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });
  });
});
