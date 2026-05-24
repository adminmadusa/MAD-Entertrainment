"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const devToken_1 = require("../../utils/devToken");
const router = (0, express_1.Router)();
/**
 * GET /token
 * Returns a short‑lived JWT for local testing.
 * Only available when NODE_ENV === 'development'.
 */
router.get('/token', (_req, res) => {
    const token = (0, devToken_1.getDevJwt)();
    res.json({ token });
});
exports.default = router;
//# sourceMappingURL=dev.routes.js.map