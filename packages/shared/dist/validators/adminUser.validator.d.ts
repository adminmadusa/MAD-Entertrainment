import { z } from 'zod';
import { AdminRole } from '../constants';
export declare const createAdminSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodNativeEnum<typeof AdminRole>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    email: string;
    password: string;
    role: AdminRole;
}, {
    name: string;
    email: string;
    password: string;
    isActive?: boolean | undefined;
    role?: AdminRole | undefined;
}>;
export declare const updateAdminSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof AdminRole>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    email?: string | undefined;
    password?: string | undefined;
    role?: AdminRole | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    email?: string | undefined;
    password?: string | undefined;
    role?: AdminRole | undefined;
}>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
//# sourceMappingURL=adminUser.validator.d.ts.map