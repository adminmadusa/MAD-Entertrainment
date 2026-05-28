export interface TicketDeliveryData {
  customerName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  bookingReference: string;
}

/**
 * Returns a responsive HTML string for a ticket delivery email.
 * The QR / ticket placeholder area is reserved for future integration
 * once the ticket scanning system is extended.
 * Self-contained — no external CSS or image dependencies.
 */
export function ticketDeliveryHtml(data: TicketDeliveryData): string {
  const { customerName, eventTitle, eventDate, venue, bookingReference } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Tickets — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">MAD</span>
              <span style="font-size:22px;font-weight:400;color:#a78bfa;"> Entertrainment</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;padding:32px;">

              <!-- Status badge -->
              <div style="text-align:center;margin-bottom:24px;">
                <span style="display:inline-block;background:#7c3aed22;color:#a78bfa;border:1px solid #7c3aed55;border-radius:999px;padding:6px 20px;font-size:13px;font-weight:600;letter-spacing:0.5px;">
                  🎟 YOUR TICKETS
                </span>
              </div>

              <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;text-align:center;line-height:1.3;">
                ${eventTitle}
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#888;text-align:center;">${eventDate}</p>

              <p style="margin:0 0 24px;font-size:15px;color:#c0c0c0;">
                Hi <strong style="color:#ffffff;">${customerName}</strong>,<br />
                your tickets are ready. Show this at the door.
              </p>

              <!-- Venue -->
              <div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:11px;color:#555;letter-spacing:1px;text-transform:uppercase;">Venue</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#e0e0e0;">📍 ${venue}</p>
              </div>

              <!-- Booking reference -->
              <div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;">Booking Reference</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:#a78bfa;font-family:monospace;letter-spacing:2px;">${bookingReference}</p>
              </div>

              <!-- QR Placeholder -->
              <div style="border:2px dashed #2a2a2a;border-radius:12px;padding:32px;text-align:center;margin-bottom:8px;">
                <p style="margin:0 0 8px;font-size:32px;">🔲</p>
                <p style="margin:0;font-size:13px;color:#555;font-weight:500;">
                  QR ticket will appear here once ticket delivery is activated.
                </p>
                <p style="margin:6px 0 0;font-size:12px;color:#444;">
                  Show your booking reference at the venue in the meantime.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;">
                Questions? Reply to this email or contact
                <a href="mailto:adminmadusa@gmail.com" style="color:#a78bfa;text-decoration:none;">support</a>.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#333;">
                &copy; ${new Date().getFullYear()} MAD Entertrainment. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
