"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingIdParamSchema = exports.slugParamSchema = exports.mongoIdSchema = exports.paginationSchema = void 0;
exports.validate = validate;
exports.validateMultiple = validateMultiple;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
/**
 * Factory for creating a Zod validation middleware
 * @param schema Zod schema to validate against
 * @param target Which part of the request to validate (default: body)
 */
function validate(schema, target = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            const errors = formatZodErrors(result.error);
            logger_1.logger.debug({ errors, path: req.path }, 'Validation failed');
            (0, response_1.sendValidationError)(res, errors);
            return;
        }
        // Replace the request data with the parsed (coerced) values
        if (target === 'body')
            req.body = result.data;
        else if (target === 'query')
            req.query = result.data;
        else if (target === 'params')
            req.params = result.data;
        next();
    };
}
/**
 * Validate multiple targets at once
 */
function validateMultiple(schemas) {
    return (req, res, next) => {
        const allErrors = {};
        for (const [target, schema] of Object.entries(schemas)) {
            if (!schema)
                continue;
            const result = schema.safeParse(req[target]);
            if (!result.success) {
                const errors = formatZodErrors(result.error, target);
                Object.assign(allErrors, errors);
            }
            else {
                if (target === 'body')
                    req.body = result.data;
                else if (target === 'query')
                    req.query = result.data;
                else if (target === 'params')
                    req.params = result.data;
            }
        }
        if (Object.keys(allErrors).length > 0) {
            (0, response_1.sendValidationError)(res, allErrors);
            return;
        }
        next();
    };
}
// ─── Helpers ──────────────────────────────────────────────────
function formatZodErrors(error, prefix) {
    const errors = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        const key = prefix ? `${prefix}.${path}` : path || 'root';
        if (!errors[key]) {
            errors[key] = [];
        }
        errors[key].push(issue.message);
    }
    return errors;
}
// ─── Common Validation Schemas ────────────────────────────────
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(12),
});
exports.mongoIdSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});
exports.slugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(200),
});
exports.bookingIdParamSchema = zod_1.z.object({
    bookingId: zod_1.z.string().min(1),
});
//# sourceMappingURL=validate.middleware.js.map