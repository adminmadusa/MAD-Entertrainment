import { Document, Types } from 'mongoose';
import { TicketTier } from '@mad/shared';
export interface ITicket extends Document {
    ticketId: string;
    bookingId: Types.ObjectId;
    eventId: Types.ObjectId;
    userId?: Types.ObjectId;
    tierName: string;
    tier: TicketTier;
    seatId?: string;
    row?: string;
    seatNumber?: number;
    section?: string;
    qrCode: string;
    qrCodeImage?: string;
    isScanned: boolean;
    scannedAt?: Date;
    scannedByAdminId?: Types.ObjectId;
    isExpired: boolean;
    expiredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Ticket: import("mongoose").Model<ITicket, {}, {}, {}, Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Ticket.model.d.ts.map