"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBearerToken = extractBearerToken;
exports.signUserToken = signUserToken;
exports.signAdminToken = signAdminToken;
exports.verifyUserToken = verifyUserToken;
exports.verifyAdminToken = verifyAdminToken;
exports.signSessionToken = signSessionToken;
exports.verifySessionToken = verifySessionToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function extractBearerToken(header) {
    if (!header?.startsWith('Bearer '))
        return undefined;
    return header.slice('Bearer '.length).trim();
}
function signUserToken(payload) {
    const env = (0, env_1.getEnv)();
    return jsonwebtoken_1.default.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}
function signAdminToken(payload) {
    const env = (0, env_1.getEnv)();
    return jsonwebtoken_1.default.sign(payload, env.JWT_ADMIN_SECRET, { expiresIn: env.JWT_ADMIN_EXPIRES_IN });
}
function verifyUserToken(token) {
    return jsonwebtoken_1.default.verify(token, (0, env_1.getEnv)().JWT_SECRET);
}
function verifyAdminToken(token) {
    return jsonwebtoken_1.default.verify(token, (0, env_1.getEnv)().JWT_ADMIN_SECRET);
}
function signSessionToken(sessionId) {
    const env = (0, env_1.getEnv)();
    return jsonwebtoken_1.default.sign({ sessionId }, env.JWT_SECRET, { expiresIn: '1d' });
}
function verifySessionToken(token) {
    const env = (0, env_1.getEnv)();
    const payload = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
    return payload.sessionId;
}
//# sourceMappingURL=jwt.js.map