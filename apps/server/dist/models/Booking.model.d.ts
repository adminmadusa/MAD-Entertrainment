import { Document, Types } from 'mongoose';
import { BookingStatus, TicketTier } from '@mad/shared';
export interface IBooking extends Document {
    bookingId: string;
    eventId: Types.ObjectId;
    userId?: Types.ObjectId;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    tickets: {
        tier: TicketTier;
        tierName: string;
        quantity: number;
        pricePerTicket: number;
        subtotal: number;
        seats?: {
            seatId: string;
            row: string;
            number: number;
            section?: string;
        }[];
    }[];
    totalTickets: number;
    subtotal: number;
    convenienceFee: number;
    gst: number;
    discount: number;
    totalAmount: number;
    currency: string;
    couponCode?: string;
    couponId?: Types.ObjectId;
    status: BookingStatus;
    paymentId?: Types.ObjectId;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Booking: import("mongoose").Model<IBooking, {}, {}, {}, Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.model.d.ts.map