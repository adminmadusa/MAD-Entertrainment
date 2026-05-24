import { Document } from 'mongoose';
export interface IDJOperator extends Document {
    name: string;
    slug: string;
    bio?: string;
    specialties?: string[];
    profileImage?: {
        url: string;
        publicId: string;
    };
    galleryImages?: {
        url: string;
        publicId: string;
    }[];
    socialLinks?: {
        instagram?: string;
        soundcloud?: string;
        youtube?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DJOperator: import("mongoose").Model<IDJOperator, {}, {}, {}, Document<unknown, {}, IDJOperator, {}, {}> & IDJOperator & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=DJOperator.model.d.ts.map