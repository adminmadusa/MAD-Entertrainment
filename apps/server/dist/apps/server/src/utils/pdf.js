"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketPDF = generateTicketPDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
async function generateTicketPDF(booking, event) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.fontSize(24).font('Helvetica-Bold').text('MAD Entertainment Ticket', { align: 'center' });
            doc.moveDown(1);
            doc.fontSize(20).text(event.title, { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Booking Reference: ${booking.bookingId}`, { align: 'center' });
            doc.moveDown(2);
            doc.fontSize(14).font('Helvetica-Bold').text('Guest Details');
            doc.fontSize(12).font('Helvetica').text(`Name: ${booking.guestName || 'Guest'}`);
            doc.text(`Email: ${booking.guestEmail}`);
            doc.moveDown(1);
            doc.fontSize(14).font('Helvetica-Bold').text('Tickets Summary');
            booking.tickets.forEach((t) => {
                doc.fontSize(12).font('Helvetica').text(`- ${t.quantity}x ${t.tierName}`);
                if (t.seats && t.seats.length > 0) {
                    doc.text(`  Seats: ${t.seats.map((s) => s.seatId).join(', ')}`);
                }
            });
            doc.moveDown(2);
            // Generate QR Code for the booking reference
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(booking.bookingId, { errorCorrectionLevel: 'H' });
            const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
            // Draw QR code centered
            const qrSize = 150;
            doc.image(qrCodeBuffer, (doc.page.width - qrSize) / 2, doc.y, { width: qrSize });
            doc.moveDown(10);
            doc.fontSize(10).font('Helvetica-Oblique').text('Please present this QR code at the venue gate.', { align: 'center' });
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
//# sourceMappingURL=pdf.js.map