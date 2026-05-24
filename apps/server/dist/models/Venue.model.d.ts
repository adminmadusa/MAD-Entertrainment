import { Document } from 'mongoose';
export interface IVenue extends Document {
    name: string;
    slug: string;
    description?: string;
    address: {
        street?: string;
        city: string;
        state: string;
        country: string;
        pincode?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    capacity: number;
    amenities?: string[];
    images: {
        url: string;
        publicId: string;
    }[];
    contactEmail?: string;
    contactPhone?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Venue: import("mongoose").Model<IVenue, {}, {}, {}, Document<unknown, {}, IVenue, {}, {}> & IVenue & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Venue.model.d.ts.map