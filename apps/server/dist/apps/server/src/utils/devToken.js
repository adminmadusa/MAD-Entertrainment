"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_USER_ID = void 0;
exports.getDevJwt = getDevJwt;
const jwt_1 = require("./jwt");
/**
 * Returns a JWT for the user "dev@example.com".
 * Expires in 1 hour. Uses the same secret/expiry logic as the normal
 * user token generation.
 */
function getDevJwt() {
    const payload = { userId: 'dev-user-id', email: 'dev@example.com' };
    return (0, jwt_1.signUserToken)(payload);
}
exports.DEV_USER_ID = 'dev-user-id';
//# sourceMappingURL=devToken.js.map