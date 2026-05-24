import { Document, Types } from 'mongoose';
export interface IEventAnalytics extends Document {
    eventId: Types.ObjectId;
    date: Date;
    bookingsCount: number;
    ticketsSold: number;
    revenue: number;
    refundsCount: number;
    refundAmount: number;
    pageViews?: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const EventAnalytics: import("mongoose").Model<IEventAnalytics, {}, {}, {}, Document<unknown, {}, IEventAnalytics, {}, {}> & IEventAnalytics & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Analytics.model.d.ts.map