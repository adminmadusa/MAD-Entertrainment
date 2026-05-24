import { Document, Types } from 'mongoose';
import { RefundStatus } from '@mad/shared';
export interface IRefund extends Document {
    bookingId: Types.ObjectId;
    paymentId: Types.ObjectId;
    amount: number;
    currency: string;
    reason?: string;
    status: RefundStatus;
    processedAt?: Date;
    gatewayRefundId?: string;
    adminNotes?: string;
    requestedById?: Types.ObjectId;
    processedByAdminId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Refund: import("mongoose").Model<IRefund, {}, {}, {}, Document<unknown, {}, IRefund, {}, {}> & IRefund & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Refund.model.d.ts.map