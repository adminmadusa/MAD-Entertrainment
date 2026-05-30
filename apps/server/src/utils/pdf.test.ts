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

describe('PDF Generation Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a fallback PDF if booking has no tickets', async () => {
    const mockBooking = {
      _id: 'booking123',
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'John Doe',
    };
    const mockEvent = {
      title: 'Neon Music Festival',
    };

    vi.mocked(Ticket.find).mockResolvedValue([]);
    const qrcodeSpy = vi.spyOn(qrcode, 'toBuffer');

    const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent);

    expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(qrcodeSpy).not.toHaveBeenCalled();
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

    vi.mocked(Ticket.find).mockResolvedValue(mockTickets as any);
    const qrcodeSpy = vi.spyOn(qrcode, 'toBuffer');

    const pdfBuffer = await generateTicketPDF(mockBooking, mockEvent);

    expect(Ticket.find).toHaveBeenCalledWith({ bookingId: mockBooking._id });
    expect(qrcodeSpy).toHaveBeenNthCalledWith(1, 'QR-1', expect.any(Object));
    expect(qrcodeSpy).toHaveBeenNthCalledWith(2, 'TKT-2', expect.any(Object)); // verifies fallback
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });
});
