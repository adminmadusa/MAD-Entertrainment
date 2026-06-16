import PDFDocument from "pdfkit";
import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";

export function drawTicketCard(doc: typeof PDFDocument): void {
  // 1. Draw the high-contrast light page background (for ink efficiency when printed)
  doc
    .rect(0, 0, SPACING.PAGE_WIDTH, SPACING.PAGE_HEIGHT)
    .fill(COLORS.PAGE_BACKGROUND);

  // 2. Draw the luxury dark ticket card container
  doc
    .rect(
      SPACING.CARD_X,
      SPACING.CARD_Y,
      SPACING.CARD_WIDTH,
      SPACING.CARD_HEIGHT,
    )
    .fill(COLORS.CARD_BACKGROUND);

  // 3. Draw sleek ticket card thin border
  doc
    .lineWidth(1.5)
    .strokeColor(COLORS.CARD_BORDER)
    .rect(
      SPACING.CARD_X,
      SPACING.CARD_Y,
      SPACING.CARD_WIDTH,
      SPACING.CARD_HEIGHT,
    )
    .stroke();

  // 4. Draw classic physical circular ticket notched side cutouts
  // Centered exactly on the perforation tear line (dividing card from scanner stub)
  doc
    .circle(SPACING.CARD_X, SPACING.PERFORATION_Y, SPACING.CUT_RADIUS)
    .fill(COLORS.PAGE_BACKGROUND);

  doc
    .circle(
      SPACING.CARD_X + SPACING.CARD_WIDTH,
      SPACING.PERFORATION_Y,
      SPACING.CUT_RADIUS,
    )
    .fill(COLORS.PAGE_BACKGROUND);

  // 5. Draw the dashed perforation stub line
  doc
    .lineWidth(1.2)
    .strokeColor(COLORS.CARD_BORDER)
    .dash(5, { space: 4 })
    .moveTo(SPACING.CARD_X + SPACING.CUT_RADIUS, SPACING.PERFORATION_Y)
    .lineTo(
      SPACING.CARD_X + SPACING.CARD_WIDTH - SPACING.CUT_RADIUS,
      SPACING.PERFORATION_Y,
    )
    .stroke()
    .undash(); // Clear dash styling for subsequent components
}
