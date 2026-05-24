"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const error_middleware_1 = require("../../middleware/error.middleware");
const user_schema_1 = require("../../models/user.schema");
const jwt_1 = require("../../utils/jwt");
const response_1 = require("../../utils/response");
async function register(req, res) {
    const { name, email, password, phone } = req.body;
    if (!email || !password) {
        throw error_middleware_1.AppError.badRequest('Email and password are required');
    }
    // Check if user exists
    const existingUser = await user_schema_1.User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        if (!existingUser.isGuest) {
            throw error_middleware_1.AppError.badRequest('Email is already registered');
        }
        // If it's a guest, upgrade to registered user
        existingUser.name = name || existingUser.name;
        existingUser.phone = phone || existingUser.phone;
        existingUser.passwordHash = await bcryptjs_1.default.hash(password, 12);
        existingUser.isGuest = false;
        await existingUser.save();
        const token = (0, jwt_1.signUserToken)({ userId: existingUser._id.toString(), email: existingUser.email, isGuest: false });
        // Set HTTP-only cookie
        res.cookie('user_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        (0, response_1.sendSuccess)(res, { user: existingUser, token }, 'Registration successful', 201);
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const user = await user_schema_1.User.create({
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        isGuest: false,
    });
    const token = (0, jwt_1.signUserToken)({ userId: user._id.toString(), email: user.email, isGuest: false });
    res.cookie('user_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    (0, response_1.sendSuccess)(res, { user, token }, 'Registration successful', 201);
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        throw error_middleware_1.AppError.badRequest('Email and password are required');
    }
    const user = await user_schema_1.User.findOne({ email: email.toLowerCase() });
    if (!user || user.isGuest) {
        throw error_middleware_1.AppError.unauthorized('Invalid email or password');
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash || '');
    if (!isMatch) {
        throw error_middleware_1.AppError.unauthorized('Invalid email or password');
    }
    const token = (0, jwt_1.signUserToken)({ userId: user._id.toString(), email: user.email, isGuest: false });
    res.cookie('user_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    (0, response_1.sendSuccess)(res, { user, token }, 'Login successful');
}
async function logout(req, res) {
    res.clearCookie('user_token');
    (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
}
async function getMe(req, res) {
    const user = await user_schema_1.User.findById(req.user?.userId);
    if (!user) {
        throw error_middleware_1.AppError.notFound('User not found');
    }
    (0, response_1.sendSuccess)(res, { user }, 'User details retrieved');
}
//# sourceMappingURL=auth.controller.js.map