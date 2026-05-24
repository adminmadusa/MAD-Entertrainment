"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
async function sendEmail(input) {
    const env = (0, env_1.getEnv)();
    if (!env.SMTP_HOST || !env.SMTP_PORT) {
        logger_1.logger.warn({ to: input.to, subject: input.subject }, 'SMTP not configured; email skipped');
        return;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transporter.sendMail({
        from: env.EMAIL_FROM ?? env.SMTP_USER,
        to: input.to,
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
    });
}
//# sourceMappingURL=email.js.map