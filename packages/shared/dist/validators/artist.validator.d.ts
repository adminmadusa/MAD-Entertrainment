import { z } from 'zod';
export declare const createArtistSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    genre: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    profileImage: z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
    }>>>;
    galleryImages: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
    socialLinks: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        instagram: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        youtube: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        spotify: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        twitter: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        facebook: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    }, {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    }>>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    slug?: string | undefined;
    bio?: string | undefined;
    profileImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    galleryImages?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | null | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    } | null | undefined;
    genre?: string[] | undefined;
}, {
    name: string;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    profileImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    galleryImages?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | null | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    } | null | undefined;
    genre?: string[] | undefined;
}>;
export declare const updateArtistSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    genre: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    profileImage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
    }>>>>;
    galleryImages: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
    }>, "many">>>>;
    socialLinks: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        instagram: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        youtube: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        spotify: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        twitter: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        facebook: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    }, {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    }>>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    profileImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    galleryImages?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | null | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    } | null | undefined;
    genre?: string[] | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    profileImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    galleryImages?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | null | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        youtube?: string | undefined;
        spotify?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    } | null | undefined;
    genre?: string[] | undefined;
}>;
export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
//# sourceMappingURL=artist.validator.d.ts.map