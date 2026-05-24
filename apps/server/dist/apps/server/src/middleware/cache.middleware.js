"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdnCache = exports.noStoreApiCache = void 0;
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
const cdnCache = (maxAgeSeconds, sMaxAgeSeconds) => {
    return (req, res, next) => {
        if (req.method !== 'GET') {
            res.setHeader('Cache-Control', 'no-store');
            return next();
        }
        const staleWhileRevalidate = Math.round(sMaxAgeSeconds * 0.2);
        res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('X-Cache-Policy', 'cdn-cache-enabled');
        next();
    };
};
exports.cdnCache = cdnCache;
//# sourceMappingURL=cache.middleware.js.map