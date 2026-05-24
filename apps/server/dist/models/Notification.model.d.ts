import { Document, Types } from 'mongoose';
import { NotificationType } from '@mad/shared';
export interface INotification extends Document {
    type: NotificationType;
    userId?: Types.ObjectId;
    bookingId?: Types.ObjectId;
    eventId?: Types.ObjectId;
    channel: 'email' | 'sms' | 'push';
    recipient: string;
    subject?: string;
    body: string;
    isSent: boolean;
    sentAt?: Date;
    failureReason?: string;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Notification.model.d.ts.map