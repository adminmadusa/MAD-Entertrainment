import { z } from 'zod';
import { EventCategory, EventMode, EventStatus, TicketTier } from '../constants';
export declare const createEventSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    shortDescription: z.ZodOptional<z.ZodString>;
    category: z.ZodNativeEnum<typeof EventCategory>;
    mode: z.ZodDefault<z.ZodNativeEnum<typeof EventMode>>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof EventStatus>>;
    coverImage: z.ZodOptional<z.ZodObject<{
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
    }>>;
    gallery: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    venueId: z.ZodOptional<z.ZodString>;
    artistIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    djOperatorIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    startDate: z.ZodDate;
    endDate: z.ZodOptional<z.ZodDate>;
    doorsOpen: z.ZodOptional<z.ZodDate>;
    ticketTiers: z.ZodArray<z.ZodObject<{
        name: z.ZodNativeEnum<typeof TicketTier>;
        price: z.ZodNumber;
        capacity: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        perks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isAvailable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: TicketTier;
        price: number;
        capacity: number;
        isAvailable: boolean;
        description?: string | undefined;
        perks?: string[] | undefined;
    }, {
        name: TicketTier;
        price: number;
        capacity: number;
        description?: string | undefined;
        perks?: string[] | undefined;
        isAvailable?: boolean | undefined;
    }>, "many">;
    totalCapacity: z.ZodOptional<z.ZodNumber>;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    isAgeRestricted: z.ZodDefault<z.ZodBoolean>;
    minimumAge: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    seoTitle: z.ZodOptional<z.ZodString>;
    seoDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    status: EventStatus;
    startDate: Date;
    category: EventCategory;
    mode: EventMode;
    ticketTiers: {
        name: TicketTier;
        price: number;
        capacity: number;
        isAvailable: boolean;
        description?: string | undefined;
        perks?: string[] | undefined;
    }[];
    isFeatured: boolean;
    isAgeRestricted: boolean;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    totalCapacity?: number | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}, {
    title: string;
    description: string;
    startDate: Date;
    category: EventCategory;
    ticketTiers: {
        name: TicketTier;
        price: number;
        capacity: number;
        description?: string | undefined;
        perks?: string[] | undefined;
        isAvailable?: boolean | undefined;
    }[];
    status?: EventStatus | undefined;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    mode?: EventMode | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    totalCapacity?: number | undefined;
    isFeatured?: boolean | undefined;
    isAgeRestricted?: boolean | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}>, {
    title: string;
    description: string;
    status: EventStatus;
    startDate: Date;
    category: EventCategory;
    mode: EventMode;
    ticketTiers: {
        name: TicketTier;
        price: number;
        capacity: number;
        isAvailable: boolean;
        description?: string | undefined;
        perks?: string[] | undefined;
    }[];
    isFeatured: boolean;
    isAgeRestricted: boolean;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    totalCapacity?: number | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}, {
    title: string;
    description: string;
    startDate: Date;
    category: EventCategory;
    ticketTiers: {
        name: TicketTier;
        price: number;
        capacity: number;
        description?: string | undefined;
        perks?: string[] | undefined;
        isAvailable?: boolean | undefined;
    }[];
    status?: EventStatus | undefined;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    mode?: EventMode | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    totalCapacity?: number | undefined;
    isFeatured?: boolean | undefined;
    isAgeRestricted?: boolean | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}>;
export declare const updateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    shortDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodNativeEnum<typeof EventCategory>>;
    mode: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof EventMode>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof EventStatus>>>;
    coverImage: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    gallery: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    venueId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    artistIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    djOperatorIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    doorsOpen: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    ticketTiers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodNativeEnum<typeof TicketTier>;
        price: z.ZodNumber;
        capacity: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        perks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isAvailable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: TicketTier;
        price: number;
        capacity: number;
        isAvailable: boolean;
        description?: string | undefined;
        perks?: string[] | undefined;
    }, {
        name: TicketTier;
        price: number;
        capacity: number;
        description?: string | undefined;
        perks?: string[] | undefined;
        isAvailable?: boolean | undefined;
    }>, "many">>;
    totalCapacity: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isAgeRestricted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    minimumAge: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    seoTitle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    seoDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    status?: EventStatus | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    category?: EventCategory | undefined;
    mode?: EventMode | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    ticketTiers?: {
        name: TicketTier;
        price: number;
        capacity: number;
        isAvailable: boolean;
        description?: string | undefined;
        perks?: string[] | undefined;
    }[] | undefined;
    totalCapacity?: number | undefined;
    isFeatured?: boolean | undefined;
    isAgeRestricted?: boolean | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    status?: EventStatus | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    slug?: string | undefined;
    shortDescription?: string | undefined;
    category?: EventCategory | undefined;
    mode?: EventMode | undefined;
    coverImage?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | undefined;
    gallery?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    }[] | undefined;
    venueId?: string | undefined;
    artistIds?: string[] | undefined;
    djOperatorIds?: string[] | undefined;
    doorsOpen?: Date | undefined;
    ticketTiers?: {
        name: TicketTier;
        price: number;
        capacity: number;
        description?: string | undefined;
        perks?: string[] | undefined;
        isAvailable?: boolean | undefined;
    }[] | undefined;
    totalCapacity?: number | undefined;
    isFeatured?: boolean | undefined;
    isAgeRestricted?: boolean | undefined;
    minimumAge?: number | undefined;
    tags?: string[] | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
}>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
//# sourceMappingURL=event.validator.d.ts.map