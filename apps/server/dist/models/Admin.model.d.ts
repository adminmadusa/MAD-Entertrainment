import { Document } from 'mongoose';
import { AdminRole } from '@mad/shared';
export interface IAdmin extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: AdminRole;
    isActive: boolean;
    lastLogin?: Date;
    permissions?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Admin: import("mongoose").Model<IAdmin, {}, {}, {}, Document<unknown, {}, IAdmin, {}, {}> & IAdmin & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Admin.model.d.ts.map