import { z } from 'zod';
export const adminLoginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email address')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters'),
});
//# sourceMappingURL=auth.validator.js.map