import { Document, Types } from 'mongoose';
import { EventCategory, BookingMode, EventStatus, TicketTier } from '@mad/shared';
export interface IEvent extends Document {
    title: string;
    slug: string;
    description: string;
    category: EventCategory;
    status: EventStatus;
    bookingMode: BookingMode;
    bannerImage: {
        url: string;
        publicId: string;
    };
    posterImage?: {
        url: string;
        publicId: string;
    };
    galleryImages?: {
        url: string;
        publicId: string;
    }[];
    startDate: Date;
    endDate?: Date;
    doorsOpenTime?: string;
    showTime: string;
    venueId: Types.ObjectId;
    onlineStreamUrl?: string;
    isOnline?: boolean;
    artistIds?: Types.ObjectId[];
    djOperatorIds?: Types.ObjectId[];
    ticketTiers: {
        tier: TicketTier;
        name: string;
        price: number;
        totalCapacity: number;
        soldCount: number;
        description?: string;
        perks?: string[];
        isActive: boolean;
        maxPerBooking?: number;
    }[];
    totalCapacity: number;
    soldCount: number;
    isFeatured: boolean;
    isSoldOut: boolean;
    seatLayoutId?: Types.ObjectId;
    tags?: string[];
    ageRestriction?: number;
    dresscode?: string;
    additionalInfo?: string;
    showCountdown?: boolean;
    isEarlyBird?: boolean;
    earlyBirdDeadline?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Event: import("mongoose").Model<IEvent, {}, {}, {}, Document<unknown, {}, IEvent, {}, {}> & IEvent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Event.model.d.ts.map