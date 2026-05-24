import { Document, Types } from 'mongoose';
import { PaymentStatus, PaymentGateway, PaymentMethod } from '@mad/shared';
export interface IPayment extends Document {
    bookingId: Types.ObjectId;
    gateway: PaymentGateway;
    method?: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    currency: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    paidAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
    failureReason?: string;
    receiptUrl?: string;
    invoiceUrl?: string;
    idempotencyKey?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Payment: import("mongoose").Model<IPayment, {}, {}, {}, Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Payment.model.d.ts.map