"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
async function sendEmail(options) {
    const env = (0, env_1.getEnv)();
    // If SMTP is not configured, we'll log it or use a mock transport (like Ethereal)
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        logger_1.logger.warn('⚠️ SMTP credentials not found. Email will NOT be sent.');
        logger_1.logger.info(`[MOCK EMAIL to ${options.to}] Subject: ${options.subject}`);
        return;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: Number(env.SMTP_PORT) === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });
    const mailOptions = {
        from: env.EMAIL_FROM || 'MAD Entertrainment <noreply@madentertrainment.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        logger_1.logger.info(`✅ Email sent to ${options.to} [MessageId: ${info.messageId}]`);
    }
    catch (error) {
        logger_1.logger.error({ error, to: options.to }, '❌ Failed to send email');
    }
}
//# sourceMappingURL=email.js.map