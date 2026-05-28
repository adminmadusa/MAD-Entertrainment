import PDFDocument from "pdfkit";
import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";

export function drawFooter(doc: typeof PDFDocument): void {
  // Positioning at the bottom margin of the page canvas, underneath the luxury card
  const startY = SPACING.CARD_Y + SPACING.CARD_HEIGHT + 14;

  // 1. Scan and entry instructions
  doc
    .font(TYPOGRAPHY.FONT_ITALIC)
    .fontSize(7.5)
    .fillColor(COLORS.TEXT_DARK)
    .text(
      "IMPORTANT ENTRY INSTRUCTIONS: Present this QR code on your mobile device or as a printed copy. " +
        "Carry a valid government-issued photo ID. Digital screenshots may be rejected if the barcode is unreadable.",
      28,
      startY,
      {
        align: "center",
        width: SPACING.PAGE_WIDTH - 56,
        lineGap: 2,
      },
    );

  // 2. Support, website and copyright footer
  const currentYear = new Date().getFullYear();
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(7)
    .fillColor(COLORS.TEXT_MUTED)
    .text(
      `MAD Entertainment   |   support@madentertrainment.com   |   www.madentertrainment.com   |   © ${currentYear} MAD Entertainment`,
      28,
      startY + 24,
      {
        align: "center",
        width: SPACING.PAGE_WIDTH - 56,
      },
    );
}
