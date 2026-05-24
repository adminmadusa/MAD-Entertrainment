"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
const crypto_1 = require("crypto");
/**
 * Generates a cryptographically‑secure idempotency key.
 * 16‑byte hex string provides ample uniqueness for our use case.
 */
function generateIdempotencyKey() {
    return (0, crypto_1.randomBytes)(16).toString('hex');
}
//# sourceMappingURL=idempotency.js.map