export interface BookingConfirmationData {
  customerName: string;
  eventTitle: string;
  bookingReference: string;
  eventDate: string;
  tickets: { tierName: string; quantity: number; price: number }[];
  totalAmount: number;
  currency?: string;
}

/**
 * Returns a responsive HTML string for a booking confirmation email.
 * Self-contained — no external CSS or image dependencies.
 */
export function bookingConfirmationHtml(data: BookingConfirmationData): string {
  const {
    customerName,
    eventTitle,
    bookingReference,
    eventDate,
    tickets,
    totalAmount,
    currency = "INR",
  } = data;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  const ticketRows = tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#c0c0c0;font-size:14px;">
          ${t.tierName}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#c0c0c0;font-size:14px;text-align:center;">
          ${t.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#e0e0e0;font-size:14px;text-align:right;">
          ${currencySymbol}${(t.price * t.quantity).toLocaleString("en-IN")}
        </td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmed — ${eventTitle}</title>
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
                <span style="display:inline-block;background:#16a34a22;color:#4ade80;border:1px solid #16a34a55;border-radius:999px;padding:6px 20px;font-size:13px;font-weight:600;letter-spacing:0.5px;">
                  ✓ BOOKING CONFIRMED
                </span>
              </div>

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;text-align:center;line-height:1.3;">
                ${eventTitle}
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#888;text-align:center;">${eventDate}</p>

              <p style="margin:0 0 24px;font-size:15px;color:#c0c0c0;">
                Hi <strong style="color:#ffffff;">${customerName}</strong>,<br />
                your booking is confirmed. Here is your summary.
              </p>

              <!-- Booking reference -->
              <div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;">Booking Reference</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:#a78bfa;font-family:monospace;letter-spacing:2px;">${bookingReference}</p>
              </div>

              <!-- Ticket breakdown -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Ticket</th>
                    <th style="text-align:center;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Qty</th>
                    <th style="text-align:right;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${ticketRows}</tbody>
              </table>

              <!-- Total -->
              <div style="display:flex;justify-content:space-between;padding-top:16px;border-top:1px solid #2a2a2a;">
                <table width="100%"><tr>
                  <td style="font-size:14px;color:#888;font-weight:600;">Total Paid</td>
                  <td style="font-size:20px;color:#a78bfa;font-weight:900;text-align:right;">${currencySymbol}${totalAmount.toLocaleString("en-IN")}</td>
                </tr></table>
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
