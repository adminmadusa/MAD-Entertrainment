import { Router, Request, Response } from "express";
import { z } from "zod";

import { requireAdmin } from "../../middleware/auth.middleware";
import { sendEmail } from "../../lib/email/send-email";
import { bookingConfirmationHtml } from "../../lib/email/templates/booking-confirmation";
import { logger } from "../../utils/logger";

const router: Router = Router();

/**
 * POST /admin/dev/test-email
 *
 * Development-only endpoint to verify email delivery.
 * Protected by admin auth. Immediately returns 501 in production.
 *
 * Body: { to: string }
 */
router.post(
  "/test-email",
  requireAdmin,
  async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      res.status(501).json({
        success: false,
        message: "Test email endpoint is disabled in production.",
      });
      return;
    }

    const bodySchema = z.object({
      to: z.string().email({ message: "A valid recipient email is required." }),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.errors.map((e) => e.message).join("; "),
      });
      return;
    }

    const { to } = parsed.data;

    logger.info({ to }, "[dev] Sending test email");

    const html = bookingConfirmationHtml({
      customerName: "Test User",
      eventTitle: "MAD Night Out — Test Event",
      bookingReference: "TEST-000001",
      eventDate: new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      tickets: [
        { tierName: "General Admission", quantity: 2, price: 499 },
        { tierName: "VIP", quantity: 1, price: 1499 },
      ],
      totalAmount: 2497,
      currency: "INR",
    });

    const result = await sendEmail({
      to,
      subject: "[MAD Dev] Test Booking Confirmation",
      html,
    });

    if (result.ok) {
      res.status(200).json({
        success: true,
        message: `Test email sent to ${to}`,
        messageId: result.messageId,
      });
      return;
    }

    const failure = result as { ok: false; error: string };
    res.status(500).json({
      success: false,
      message: "Email delivery failed.",
      error: failure.error,
    });
  },
);

export default router;
