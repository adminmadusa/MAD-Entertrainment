import { z } from 'zod';
import { PopupTrigger } from '../constants';
export declare const createPopupSchema: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
    ctaText: z.ZodOptional<z.ZodString>;
    ctaUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    trigger: z.ZodDefault<z.ZodNativeEnum<typeof PopupTrigger>>;
    triggerDelay: z.ZodDefault<z.ZodNumber>;
    cooldownHours: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    showOnPages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    linkedEventId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    startDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    endDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    priority: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    title: string;
    trigger: PopupTrigger;
    triggerDelay: number;
    cooldownHours: number;
    isActive: boolean;
    priority: number;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    ctaText?: string | undefined;
    ctaUrl?: string | undefined;
    showOnPages?: string[] | undefined;
    linkedEventId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    title: string;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    ctaText?: string | undefined;
    ctaUrl?: string | undefined;
    trigger?: PopupTrigger | undefined;
    triggerDelay?: number | undefined;
    cooldownHours?: number | undefined;
    isActive?: boolean | undefined;
    showOnPages?: string[] | undefined;
    linkedEventId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    priority?: number | undefined;
}>;
export declare const updatePopupSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    image: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
    ctaText: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaUrl: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    trigger: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof PopupTrigger>>>;
    triggerDelay: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    cooldownHours: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    showOnPages: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    linkedEventId: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    ctaText?: string | undefined;
    ctaUrl?: string | undefined;
    trigger?: PopupTrigger | undefined;
    triggerDelay?: number | undefined;
    cooldownHours?: number | undefined;
    isActive?: boolean | undefined;
    showOnPages?: string[] | undefined;
    linkedEventId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    priority?: number | undefined;
}, {
    name?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    image?: {
        url: string;
        publicId: string;
        alt?: string | undefined;
    } | null | undefined;
    ctaText?: string | undefined;
    ctaUrl?: string | undefined;
    trigger?: PopupTrigger | undefined;
    triggerDelay?: number | undefined;
    cooldownHours?: number | undefined;
    isActive?: boolean | undefined;
    showOnPages?: string[] | undefined;
    linkedEventId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    priority?: number | undefined;
}>;
export type CreatePopupInput = z.infer<typeof createPopupSchema>;
export type UpdatePopupInput = z.infer<typeof updatePopupSchema>;
//# sourceMappingURL=popup.validator.d.ts.map