import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

import { COLORS } from "../utils/colors";
import { SPACING } from "../utils/spacing";
import { TYPOGRAPHY } from "../utils/typography";

const LOGO_ASSET_PATH = path.resolve(__dirname, "../../../../assets/brand/pdf-logo.png");

export function drawHeader(doc: typeof PDFDocument, ticket: any): void {
  const startX = SPACING.CARD_X + SPACING.MARGIN_X;
  const startY = SPACING.CARD_Y + SPACING.MARGIN_Y;

  // 1. Draw MAD Entertainments Brand Logo & Title
  const hasLogoImage = fs.existsSync(LOGO_ASSET_PATH);

  if (hasLogoImage) {
    try {
      doc.image(LOGO_ASSET_PATH, startX, startY - 2, { fit: [28, 28] });

      doc
        .font(TYPOGRAPHY.FONT_BOLD)
        .fontSize(13)
        .fillColor(COLORS.TEXT_PRIMARY)
        .text("MAD", startX + 34, startY - 1);

      doc
        .font(TYPOGRAPHY.FONT_BOLD)
        .fontSize(7.5)
        .fillColor(COLORS.TEXT_MUTED)
        .text("ENTERTAINMENTS", startX + 34, startY + 13);
    } catch {
      drawTextBrandingFallback(doc, startX, startY);
    }
  } else {
    drawTextBrandingFallback(doc, startX, startY);
  }

  // 2. Compute dynamic ticket status/tier badge colors and text
  const tier = (ticket?.tier || "general_admission").toLowerCase();
  let badgeColor: string;
  let badgeText: string;

  if (tier === "vip") {
    badgeColor = COLORS.ACCENT_VIP;
    badgeText = "VIP PASS";
  } else if (tier === "general_admission" || tier === "ga") {
    badgeColor = COLORS.ACCENT_GA;
    badgeText = "GENERAL ADMIT";
  } else {
    badgeColor = COLORS.ACCENT_CONFIRMED;
    badgeText = (ticket?.tierName || "CONFIRMED").toUpperCase();
  }

  // Draw beautiful rounded badge on the top right
  const badgeWidth = 110;
  const badgeHeight = 22;
  const badgeX =
    SPACING.CARD_X + SPACING.CARD_WIDTH - SPACING.MARGIN_X - badgeWidth;
  const badgeY = startY + 2;

  // Fill badge container
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 5).fill(badgeColor);

  // Center text inside badge container
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_PRIMARY)
    .text(badgeText, badgeX, badgeY + 7, {
      align: "center",
      width: badgeWidth,
    });
}

function drawTextBrandingFallback(
  doc: typeof PDFDocument,
  startX: number,
  startY: number
): void {
  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(16)
    .fillColor(COLORS.BRAND_RED)
    .text("M A D", startX, startY);

  doc
    .font(TYPOGRAPHY.FONT_BOLD)
    .fontSize(8)
    .fillColor(COLORS.TEXT_MUTED)
    .text("ENTERTAINMENTS", startX, startY + 18);
}
