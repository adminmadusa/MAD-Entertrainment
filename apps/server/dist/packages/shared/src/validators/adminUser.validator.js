"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminSchema = exports.createAdminSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.createAdminSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    role: zod_1.z.nativeEnum(constants_1.AdminRole).default(constants_1.AdminRole.ADMIN),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateAdminSchema = exports.createAdminSchema.partial();
//# sourceMappingURL=adminUser.validator.js.map