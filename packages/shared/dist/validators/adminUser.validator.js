import { z } from 'zod';
import { AdminRole } from '../constants';
export const createAdminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    role: z.nativeEnum(AdminRole).default(AdminRole.ADMIN),
    isActive: z.boolean().default(true),
});
export const updateAdminSchema = createAdminSchema.partial();
//# sourceMappingURL=adminUser.validator.js.map