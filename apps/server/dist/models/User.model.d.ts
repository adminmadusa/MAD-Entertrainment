import { Document } from 'mongoose';
import { SupportedCurrency } from '@mad/shared';
export interface IUser extends Document {
    name?: string;
    email?: string;
    phone?: string;
    passwordHash?: string;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    isGuest: boolean;
    googleId?: string;
    profileImage?: {
        url: string;
        publicId: string;
    };
    preferredCurrency: SupportedCurrency;
    otpHash?: string;
    otpExpiry?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.model.d.ts.map