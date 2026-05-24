"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginSchema = void 0;
const zod_1 = require("zod");
exports.adminLoginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email address')
        .toLowerCase()
        .trim(),
    password: zod_1.z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters'),
});
//# sourceMappingURL=auth.validator.js.map