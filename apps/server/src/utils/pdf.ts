import PDFDocument from 'pdfkit';

export async function generateTicketPDF(booking: any, event: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('MAD Entertrainment Ticket');
    doc.moveDown();
    doc.fontSize(12).text(`Booking: ${booking.bookingId}`);
    doc.text(`Event: ${event?.title ?? 'MAD Event'}`);
    doc.text(`Guest: ${booking.guestName ?? 'Guest'}`);
    doc.text(`Tickets: ${booking.totalTickets}`);
    doc.text(`Amount: ${booking.currency ?? 'INR'} ${booking.totalAmount}`);
    doc.end();
  });
}
