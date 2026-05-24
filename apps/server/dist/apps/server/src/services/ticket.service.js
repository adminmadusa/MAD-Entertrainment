"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
const logger_1 = require("../utils/logger");
class TicketService {
    /**
     * Generate QR Code as Buffer (PNG)
     */
    static async generateQRCode(ticketId) {
        // Generate secure validation endpoint / payload
        const payload = JSON.stringify({ ticketId, v: 1 });
        return qrcode_1.default.toBuffer(payload, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 200,
        });
    }
    /**
     * Generate Ticket PDF as Buffer
     */
    static async generateTicketPDF(data) {
        return new Promise(async (resolve, reject) => {
            try {
                const qrBuffer = await this.generateQRCode(data.ticketId);
                const doc = new pdfkit_1.default({ size: 'A6', margin: 15 });
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', (err) => reject(err));
                // ─── Design ──────────────────────────────────────────
                // Premium Dark Card Style
                doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0F0F10');
                // Gold highlight border
                doc.rect(5, 5, doc.page.width - 10, doc.page.height - 10).stroke('#D4AF37');
                // Brand Title
                doc.fillColor('#D4AF37')
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text('MAD ENTERTAINMENT', 15, 20, { align: 'center' });
                // Divider
                doc.moveTo(15, 40).lineTo(doc.page.width - 15, 40).strokeColor('#2D2D30').stroke();
                // Event Details
                doc.fillColor('#FFFFFF')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text(data.eventName, 15, 50, { align: 'center' });
                doc.fillColor('#A0A0AB')
                    .fontSize(9)
                    .font('Helvetica')
                    .text(`${data.eventDate} | ${data.venueName}`, 15, 68, { align: 'center' });
                // Divider
                doc.moveTo(15, 85).lineTo(doc.page.width - 15, 85).strokeColor('#2D2D30').stroke();
                // Seat Info Box
                doc.rect(15, 95, doc.page.width - 30, 45).fill('#1E1E20');
                doc.fillColor('#FFFFFF')
                    .fontSize(10)
                    .font('Helvetica-Bold')
                    .text('SEAT / ACCESS', 25, 103);
                doc.fillColor('#D4AF37')
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text(data.seatCode, 25, 118);
                // User / Ref Info
                doc.fillColor('#A0A0AB')
                    .fontSize(8)
                    .font('Helvetica')
                    .text(`Attendee: ${data.userName}`, 15, 155);
                doc.text(`Booking Ref: ${data.bookingRef}`, 15, 168);
                // QR Code Embedding
                doc.image(qrBuffer, (doc.page.width - 120) / 2, 190, { width: 120, height: 120 });
                // Footer
                doc.fillColor('#52525B')
                    .fontSize(6)
                    .text(`Ticket ID: ${data.ticketId}`, 15, 325, { align: 'center' });
                doc.end();
            }
            catch (err) {
                logger_1.logger.error({ err, ticketId: data.ticketId }, 'Failed to generate ticket PDF');
                reject(err);
            }
        });
    }
}
exports.TicketService = TicketService;
//# sourceMappingURL=ticket.service.js.map