import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * Zod 4 creates schema instances with their own prototype, so
 * `extendZodWithOpenApi` must run before any schema is constructed.
 * Importing this module first guarantees that ordering.
 *
 * This module must not import any schema module (including @mad/validations),
 * otherwise the schemas are created before the extension is applied.
 */
extendZodWithOpenApi(z);
