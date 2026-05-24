import { Document } from 'mongoose';
export interface IArtist extends Document {
    name: string;
    slug: string;
    bio?: string;
    genre?: string[];
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
        youtube?: string;
        spotify?: string;
        twitter?: string;
        facebook?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Artist: import("mongoose").Model<IArtist, {}, {}, {}, Document<unknown, {}, IArtist, {}, {}> & IArtist & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Artist.model.d.ts.map