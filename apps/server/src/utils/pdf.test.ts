import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTicketPDF } from './pdf';
import { Ticket } from '../models/ticket.schema';
import qrcode from 'qrcode';

// Mock models
vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

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
  });

  it('should throw an error and log if booking has no tickets', async () => {
    const mockBooking = {
      _id: 'booking123',
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'John Doe',
    };
    const mockEvent = {
      title: 'Neon Music Festival',
    };

    const mockSort = vi.fn().mockResolvedValue([]);
    vi.mocked(Ticket.find).mockReturnValue({
      sort: mockSort,
    } as any);

    await expect(generateTicketPDF(mockBooking, mockEvent)).rejects.toThrow(
      'No tickets found for booking: MAD-2026-ABCDE'
    );

    expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 });
  });

  it('should generate multi-page PDF with unique QR codes for each ticket', async () => {
    const mockBooking = {
      _id: 'booking123',
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'John Doe',
    };
    const mockEvent = {
      title: 'Neon Music Festival',
    };
    const mockTickets = [
      { ticketId: 'TKT-1', qrCode: 'QR-1', tierName: 'VIP' },
      { ticketId: 'TKT-2', qrCode: undefined, tierName: 'General' }, // fallback check
    ];

    const mockSort = vi.fn().mockResolvedValue(mockTickets);
    vi.mocked(Ticket.find).mockReturnValue({
      sort: mockSort,
    } as any);

    const qrcodeSpy = vi.spyOn(qrcode, 'toBuffer');

    const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent);

    expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(qrcodeSpy).toHaveBeenNthCalledWith(1, 'QR-1', expect.any(Object));
    expect(qrcodeSpy).toHaveBeenNthCalledWith(2, 'TKT-2', expect.any(Object)); // verifies fallback
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });
});
