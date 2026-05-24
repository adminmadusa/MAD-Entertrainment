import { Document, Types } from 'mongoose';
import { PaymentStatus, PaymentGateway } from '@mad/shared';
export interface ITransaction extends Document {
    bookingId: Types.ObjectId;
    paymentId: Types.ObjectId;
    type: 'charge' | 'refund';
    amount: number;
    currency: string;
    gateway: PaymentGateway;
    gatewayTransactionId: string;
    status: PaymentStatus;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Transaction: import("mongoose").Model<ITransaction, {}, {}, {}, Document<unknown, {}, ITransaction, {}, {}> & ITransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Transaction.model.d.ts.map