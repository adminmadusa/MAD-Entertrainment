import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";

export async function drawQRSection(
  doc: typeof PDFDocument,
  ticket: any,
  booking: any,
): Promise<void> {
  const ticketId = ticket?.ticketId || `TKT-${booking.bookingId}-001`;

  // 1. Generate QR Code containing the ticket validation serial ID
  // Uses a high-contrast layout: White QR lines on dark luxury background
  const qrBuffer = await QRCode.toBuffer(ticketId, {
    margin: 1,
    width: 100,
    color: {
      dark: "#FFFFFF", // White data blocks
      light: "#121212", // Matching card background
    },
  });

  const qrWidth = 100;
  const qrHeight = 100;
  const qrX = SPACING.CARD_X + (SPACING.CARD_WIDTH - qrWidth) / 2;
  const qrY = SPACING.PERFORATION_Y + 28;

  // 2. Render helper header text in stub
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text(
      "S C A N  T O  V E R I F Y  E N T R Y",
      SPACING.CARD_X,
      SPACING.PERFORATION_Y + 12,
      {
        align: "center",
        width: SPACING.CARD_WIDTH,
      },
    );

  // 3. Embed generated QR code image buffer
  doc.image(qrBuffer, qrX, qrY, { width: qrWidth, height: qrHeight });

  // 4. Render human-readable serial reference block beneath QR
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(9)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(ticketId, SPACING.CARD_X, qrY + qrHeight + 8, {
      align: "center",
      width: SPACING.CARD_WIDTH,
    });
}
