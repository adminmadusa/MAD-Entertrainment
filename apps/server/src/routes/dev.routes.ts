import { Router } from 'express';

import { getEnv } from '../config/env';
import { verifyTransporter } from '../utils/email.js';
import { requireAdmin } from '../middleware/auth.middleware';

const router: Router = Router();

router.use(requireAdmin);

router.get('/email-health', async (_req, res) => {
  const env = getEnv();

  // Safe SMTP configurations (strictly no passwords/secrets exposed)
  const smtpConfigured = !!(env.SMTP_HOST && env.SMTP_PORT);
  const smtpSecure = env.SMTP_SECURE ?? env.SMTP_PORT === 465;

  const isVerified = await verifyTransporter();

  res.json({
    success: true,
    data: {
      smtpConfigured,
      smtpHost: env.SMTP_HOST || null,
      smtpPort: env.SMTP_PORT || null,
      smtpSecure,
      smtpUser: env.SMTP_USER || null,
      mailFrom: env.MAIL_FROM || null,
      emailReplyTo: env.EMAIL_REPLY_TO || null,
      transporterVerified: isVerified,
    },
  });
});

export default router;
