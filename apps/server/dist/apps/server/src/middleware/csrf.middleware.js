"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = void 0;
const csurf = require('csurf');
// Enable CSRF protection via env flag. Default off for APIs.
const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';
const csrfProtection = (req, res, next) => {
    if (!ENABLE_CSRF) {
        return next();
    }
    // csurf middleware expects cookie parser; we assume it's already set up in the app.
    csurf({ cookie: true })(req, res, next);
};
exports.csrfProtection = csrfProtection;
//# sourceMappingURL=csrf.middleware.js.map