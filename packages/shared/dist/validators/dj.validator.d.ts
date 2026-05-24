import { z } from 'zod';
export declare const createDJSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
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
        soundcloud: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        youtube: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        instagram?: string | undefined;
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    }, {
        instagram?: string | undefined;
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    }>>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    slug?: string | undefined;
    bio?: string | undefined;
    specialties?: string[] | undefined;
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
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    } | null | undefined;
}, {
    name: string;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    specialties?: string[] | undefined;
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
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    } | null | undefined;
}>;
export declare const updateDJSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    specialties: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
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
        soundcloud: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        youtube: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        instagram?: string | undefined;
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    }, {
        instagram?: string | undefined;
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    }>>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    specialties?: string[] | undefined;
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
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    } | null | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
    isActive?: boolean | undefined;
    bio?: string | undefined;
    specialties?: string[] | undefined;
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
        soundcloud?: string | undefined;
        youtube?: string | undefined;
    } | null | undefined;
}>;
export type CreateDJInput = z.infer<typeof createDJSchema>;
export type UpdateDJInput = z.infer<typeof updateDJSchema>;
//# sourceMappingURL=dj.validator.d.ts.map