"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noStoreApiCache = void 0;
const NO_STORE_VALUE = 'no-store, no-cache, must-revalidate, proxy-revalidate';
const noStoreApiCache = (_req, res, next) => {
    res.setHeader('Cache-Control', NO_STORE_VALUE);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Cache-Policy', 'api-no-store');
    res.setHeader('X-Cache-Debug', 'MISS; store=disabled');
    next();
};
exports.noStoreApiCache = noStoreApiCache;
//# sourceMappingURL=cache.middleware.js.map