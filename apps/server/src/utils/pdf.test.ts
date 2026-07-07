import qrcode from 'qrcode';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getEnv } from '../config/env';
import { generateTicketPDF as generateModular } from '../lib/pdf/ticket/generate-ticket-pdf';
import { Ticket } from '../models/ticket.schema';
import { generateTicketPDF } from './pdf';

// Mock Models
vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

// Mock Config Env
vi.mock('../config/env', () => ({
  getEnv: vi.fn(),
}));

// Mock Logger to keep stdout clean
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Spy on/Mock modular generator but allow original implementation by default
vi.mock('../lib/pdf/ticket/generate-ticket-pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/pdf/ticket/generate-ticket-pdf')>();
  return {
    ...original,
    generateTicketPDF: vi.fn(original.generateTicketPDF),
  };
});

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

  describe('Wrapper Logic', () => {
    it('should throw an error if booking has no tickets (Monolithic)', async () => {
      vi.mocked(getEnv).mockReturnValue({ ENABLE_MODULAR_PDF: false } as any);
      const mockSort = vi.fn().mockResolvedValue([]);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      await expect(generateTicketPDF(mockBooking, mockEvent)).rejects.toThrow(
        'No tickets found for booking: MAD-2026-ABCDE'
      );
    });

    it('should fallback to default single ticket in Modular if no tickets found', async () => {
      vi.mocked(getEnv).mockReturnValue({ ENABLE_MODULAR_PDF: true } as any);
      // Mock Ticket.find to return empty array
      const mockSort = vi.fn().mockResolvedValue([]);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Monolithic Engine — Visibility Matrix', () => {
    beforeEach(() => {
      vi.mocked(getEnv).mockReturnValue({ ENABLE_MODULAR_PDF: false } as any);
    });

    it('should render QR code for unassigned ticket', async () => {
      const mockTickets = [
        { ticketId: 'TKT-UNASSIGNED', qrCode: 'QR-1', assignmentStatus: 'unassigned', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });

      expect(qrcode.toBuffer).toHaveBeenCalledWith('QR-1', expect.any(Object));
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should hide/mask QR and Ticket ID for pending ticket', async () => {
      const mockTickets = [
        { ticketId: 'TKT-PENDING', qrCode: 'QR-2', assignmentStatus: 'pending', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, { role: 'purchaser' });

      // QR generator should never be called
      expect(qrcode.toBuffer).not.toHaveBeenCalled();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should hide/mask QR and Ticket ID for claimed ticket in purchaser context', async () => {
      const mockTickets = [
        { ticketId: 'TKT-CLAIMED', qrCode: 'QR-3', assignmentStatus: 'claimed', status: 'active' },
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
        qrCode: 'QR-3',
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
      expect(qrcode.toBuffer).toHaveBeenCalledWith('QR-3', expect.any(Object));
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should throw an error for mismatched or unauthorized attendee requests', async () => {
      const mockTicket = {
        ticketId: 'TKT-CLAIMED',
        assignmentStatus: 'claimed',
        status: 'active',
        attendeeUserId: 'user-other',
      };
      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

      await expect(
        generateTicketPDF(mockBooking, mockEvent, {
          role: 'attendee',
          targetTicketId: 'TKT-CLAIMED',
          userId: 'user-123',
        })
      ).rejects.toThrow('Unauthorized to access this ticket PDF');
    });
  });

  describe('Modular Engine — Visibility Matrix', () => {
    beforeEach(() => {
      vi.mocked(getEnv).mockReturnValue({ ENABLE_MODULAR_PDF: true } as any);
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

  describe('Wrapper Fallback & Context Preservation', () => {
    it('should forward complete options context to monolithic engine during modular fallback', async () => {
      // Force modular execution in wrapper but mock module implementation to reject
      vi.mocked(getEnv).mockReturnValue({ ENABLE_MODULAR_PDF: true } as any);
      vi.mocked(generateModular).mockRejectedValueOnce(new Error('Modular PDF engine failed'));

      // Configure monolithic mocks for verification
      const mockTickets = [
        { ticketId: 'TKT-FALLBACK', qrCode: 'QR-FALLBACK', assignmentStatus: 'unassigned', status: 'active' },
      ];
      const mockSort = vi.fn().mockResolvedValue(mockTickets);
      vi.mocked(Ticket.find).mockReturnValue({ sort: mockSort } as any);

      const options = { role: 'purchaser', userId: 'user-123' } as any;
      const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent, options);

      expect(generateModular).toHaveBeenCalledWith(mockBooking, mockEvent, options);
      expect(qrcode.toBuffer).toHaveBeenCalledWith('QR-FALLBACK', expect.any(Object));
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });
  });
});
