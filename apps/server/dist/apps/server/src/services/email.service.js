"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class EmailService {
    static getTransporter() {
        if (this.transporter)
            return this.transporter;
        const env = (0, env_1.getEnv)();
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
            this.transporter = nodemailer_1.default.createTransport({
                host: env.SMTP_HOST,
                port: env.SMTP_PORT ?? 587,
                secure: (env.SMTP_PORT ?? 587) === 465,
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                },
            });
            logger_1.logger.info('✅ SMTP Email Transporter initialized');
        }
        else {
            // Dev / Test Mock Transporter
            this.transporter = nodemailer_1.default.createTransport({
                streamTransport: true,
                newline: 'unix',
                buffer: true,
            });
            logger_1.logger.warn('⚠️ SMTP credentials missing; email service initialized in mock stream-only mode');
        }
        return this.transporter;
    }
    static async sendEmail(options) {
        const env = (0, env_1.getEnv)();
        const from = env.EMAIL_FROM || 'noreply@mad-entertainment.com';
        try {
            const transporter = this.getTransporter();
            const info = await transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
            });
            // If mock, log the raw payload
            if (!env.SMTP_HOST) {
                logger_1.logger.debug({ to: options.to, subject: options.subject }, '✉️ Email sent (mocked stream)');
            }
            else {
                logger_1.logger.info({ messageId: info.messageId, to: options.to }, '✉️ Email sent successfully');
            }
            return true;
        }
        catch (err) {
            logger_1.logger.error({ err, to: options.to, subject: options.subject }, '❌ Failed to send email');
            return false;
        }
    }
}
exports.EmailService = EmailService;
EmailService.transporter = null;
//# sourceMappingURL=email.service.js.map