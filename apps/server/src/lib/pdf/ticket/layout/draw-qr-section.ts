import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";
import { getPurchaserPDFTicketState } from "../../../../services/public/ticket-ownership.service";

export async function drawQRSection(
  doc: typeof PDFDocument,
  ticket: any,
  booking: any,
  options: {
    role?: 'purchaser' | 'attendee';
    targetTicketId?: string;
    userId?: string;
  } = { role: "purchaser" }
): Promise<void> {
  const role = options?.role ?? "purchaser";
  const ticketId = ticket?.ticketId || `TKT-${booking.bookingId}-001`;

  let canRenderQR = false;
  let statusMessage = "";
  if (role === "attendee") {
    canRenderQR = true;
  } else {
    const state = getPurchaserPDFTicketState(ticket);
    canRenderQR = state.canRenderQR;
    statusMessage = state.message || "";
  }

  // 1. Render helper header text in stub
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

  const qrWidth = 100;
  const qrHeight = 100;
  const qrX = SPACING.CARD_X + (SPACING.CARD_WIDTH - qrWidth) / 2;
  const qrY = SPACING.PERFORATION_Y + 28;

  if (canRenderQR) {
    const qrPayload = ticket?.qrCode ?? ticketId;

    // Generate QR Code containing the ticket validation serial ID
    // Uses a high-contrast layout: White QR lines on dark luxury background
    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      margin: 1,
      width: 100,
      color: {
        dark: "#FFFFFF", // White data blocks
        light: "#121212", // Matching card background
      },
    });

    // Embed generated QR code image buffer
    doc.image(qrBuffer, qrX, qrY, { width: qrWidth, height: qrHeight });

    // Render human-readable serial reference block beneath QR
    doc
      .font(TYPOGRAPHY.FONT_BOLD)
      .fontSize(9)
      .fillColor(COLORS.TEXT_PRIMARY)
      .text(ticketId, SPACING.CARD_X, qrY + qrHeight + 8, {
        align: "center",
        width: SPACING.CARD_WIDTH,
      });
  } else {
    // Masked state: draw status box and omit Ticket ID
    const boxWidth = 240;
    const boxHeight = 100;
    const boxX = SPACING.CARD_X + (SPACING.CARD_WIDTH - boxWidth) / 2;
    const boxY = SPACING.PERFORATION_Y + 28;

    doc
      .fillColor("#1c1c1e")
      .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
      .fill();

    doc
      .strokeColor("#3a3a3c")
      .lineWidth(1)
      .roundedRect(boxX, boxY, boxWidth, boxHeight, 6)
      .stroke();

    doc
      .font(TYPOGRAPHY.FONT_REGULAR)
      .fontSize(8.5)
      .fillColor(COLORS.TEXT_MUTED)
      .text(statusMessage, boxX + 12, boxY + 12, {
        align: "center",
        width: boxWidth - 24,
      });
  }
}
