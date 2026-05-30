import PDFDocument from 'pdfkit';
import qrcode from 'qrcode';
import { Ticket } from '../models/ticket.schema';

export async function generateTicketPDF(booking: any, event: any): Promise<Buffer> {
  // 1. Fetch tickets associated with this booking
  const tickets = await Ticket.find({ bookingId: booking._id });

  // 2. Generate QR PNG buffers in parallel
  const qrPromises = tickets.map((t) =>
    qrcode.toBuffer(t.qrCode ?? t.ticketId, { type: 'png', margin: 1 })
  );
  const qrBuffers = await Promise.all(qrPromises);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (tickets.length === 0) {
      // Fallback for bookings with no tickets
      doc.fontSize(20).text('MAD Entertrainment Ticket');
      doc.moveDown();
      doc.fontSize(12).text(`Booking: ${booking.bookingId}`);
      doc.text(`Event: ${event?.title ?? 'MAD Event'}`);
      doc.text(`Guest: ${booking.guestName ?? 'Guest'}`);
      doc.text('No tickets associated with this booking.');
      doc.end();
      return;
    }

    // 3. Render one page per ticket
    tickets.forEach((ticket, idx) => {
      if (idx > 0) {
        doc.addPage();
      }

      const qrBuffer = qrBuffers[idx];

      doc.fontSize(20).text('MAD Entertrainment Ticket');
      doc.moveDown();
      doc.fontSize(12).text(`Event: ${event?.title ?? 'MAD Event'}`);
      doc.text(`Booking: ${booking.bookingId}`);
      doc.text(`Ticket ID: ${ticket.ticketId}`);
      doc.text(`Tier: ${ticket.tierName || ticket.tier}`);
      
      doc.moveDown();
      if (qrBuffer) {
        doc.image(qrBuffer, { width: 150 } as any);
      }
    });

    doc.end();
  });
}
