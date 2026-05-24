import { Document, Types } from 'mongoose';
import { SeatStatus, TicketTier } from '@mad/shared';
export interface ISeatLayout extends Document {
    eventId: Types.ObjectId;
    rows: number;
    columns: number;
    sections: {
        name: string;
        rows: string[];
        tier: TicketTier;
        color?: string;
    }[];
    seats: {
        seatId: string;
        row: string;
        number: number;
        section?: string;
        status: SeatStatus;
        tier: TicketTier;
        price: number;
        lockedBy?: string;
        lockedAt?: Date;
        bookedByBookingId?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const SeatLayout: import("mongoose").Model<ISeatLayout, {}, {}, {}, Document<unknown, {}, ISeatLayout, {}, {}> & ISeatLayout & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SeatLayout.model.d.ts.map