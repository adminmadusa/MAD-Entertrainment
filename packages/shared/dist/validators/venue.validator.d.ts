import { z } from 'zod';
export declare const createVenueSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    address: z.ZodObject<{
        street: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        pincode: z.ZodString;
        country: z.ZodDefault<z.ZodString>;
        coordinates: z.ZodOptional<z.ZodObject<{
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
        }, {
            lat: number;
            lng: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        state: string;
        pincode: string;
        country: string;
        street?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    }, {
        city: string;
        state: string;
        pincode: string;
        street?: string | undefined;
        country?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    }>;
    capacity: z.ZodNumber;
    amenities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    images: z.ZodDefault<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }>, "many">>;
    contactEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    contactPhone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    address: {
        city: string;
        state: string;
        pincode: string;
        country: string;
        street?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    };
    capacity: number;
    images: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[];
    isActive: boolean;
    slug?: string | undefined;
    description?: string | undefined;
    amenities?: string[] | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
}, {
    name: string;
    address: {
        city: string;
        state: string;
        pincode: string;
        street?: string | undefined;
        country?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    };
    capacity: number;
    slug?: string | undefined;
    description?: string | undefined;
    amenities?: string[] | undefined;
    images?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updateVenueSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodObject<{
        street: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        pincode: z.ZodString;
        country: z.ZodDefault<z.ZodString>;
        coordinates: z.ZodOptional<z.ZodObject<{
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
        }, {
            lat: number;
            lng: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        state: string;
        pincode: string;
        country: string;
        street?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    }, {
        city: string;
        state: string;
        pincode: string;
        street?: string | undefined;
        country?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    }>>;
    capacity: z.ZodOptional<z.ZodNumber>;
    amenities: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        publicId: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }, {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }>, "many">>>;
    contactEmail: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    contactPhone: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
    description?: string | undefined;
    address?: {
        city: string;
        state: string;
        pincode: string;
        country: string;
        street?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    } | undefined;
    capacity?: number | undefined;
    amenities?: string[] | undefined;
    images?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    isActive?: boolean | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
    description?: string | undefined;
    address?: {
        city: string;
        state: string;
        pincode: string;
        street?: string | undefined;
        country?: string | undefined;
        coordinates?: {
            lat: number;
            lng: number;
        } | undefined;
    } | undefined;
    capacity?: number | undefined;
    amenities?: string[] | undefined;
    images?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    isActive?: boolean | undefined;
}>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
//# sourceMappingURL=venue.validator.d.ts.map