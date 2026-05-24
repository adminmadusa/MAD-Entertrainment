"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketPDF = generateTicketPDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
async function generateTicketPDF(booking, event) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 48 });
        const chunks = [];
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
//# sourceMappingURL=pdf.js.map