import { z } from 'zod';
export declare const adminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
//# sourceMappingURL=auth.validator.d.ts.map