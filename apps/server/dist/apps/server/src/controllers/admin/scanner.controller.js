"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTicket = void 0;
const error_middleware_1 = require("../../middleware/error.middleware");
const ticket_schema_1 = require("../../models/ticket.schema");
const scanTicket = async (req, res) => {
    const { ticketId, eventId } = req.body;
    if (!ticketId || !eventId) {
        throw error_middleware_1.AppError.badRequest('ticketId and eventId are required for scanning');
    }
    const ticket = await ticket_schema_1.Ticket.findOne({ ticketId, eventId });
    if (!ticket) {
        throw error_middleware_1.AppError.notFound('Ticket not found for this event');
    }
    if (ticket.isScanned) {
        throw error_middleware_1.AppError.badRequest(`Ticket already scanned at ${ticket.scannedAt?.toISOString()}`);
    }
    if (ticket.isExpired) {
        throw error_middleware_1.AppError.badRequest('Ticket is expired');
    }
    ticket.isScanned = true;
    ticket.scannedAt = new Date();
    ticket.scannedByAdminId = req.admin?.adminId;
    await ticket.save();
    res.json({
        status: 'success',
        message: 'Ticket scanned successfully',
        data: {
            ticketId: ticket.ticketId,
            tierName: ticket.tierName,
            admits: ticket.admits,
            scannedAt: ticket.scannedAt,
        },
    });
};
exports.scanTicket = scanTicket;
//# sourceMappingURL=scanner.controller.js.map