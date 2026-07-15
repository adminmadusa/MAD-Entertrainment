import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFooter } from "./EmailFooter";
import { EmailHeader } from "./EmailHeader";
import { EmailLayout } from "./EmailLayout";

export interface EmailBaseProps {
  previewText: string;
  badgeText: string;
  badgeStyle: React.CSSProperties;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}

export function EmailBase({
  previewText,
  badgeText,
  badgeStyle,
  title,
  subtitle,
  description,
  children,
}: EmailBaseProps) {
  return (
    <EmailLayout previewText={previewText}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={{ ...baseBadgeStyle, ...badgeStyle }}>{badgeText}</Text>
        </Section>

        <Heading style={subtitle ? titleStyleWithSubtitle : titleStyle}>
          {title}
        </Heading>

        {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}

        <Text style={greetingStyle}>{description}</Text>

        {children}
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

// Shared styles that templates can import to maintain design system consistency
export const emailSharedStyles = {
  // Main detail boxes
  detailBox: {
    background: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "24px",
  },
  // Small info blocks (e.g. venue in ticket delivery)
  infoBlock: {
    background: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "24px",
  },
  // Reference card box (booking ref box)
  referenceCard: {
    background: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  // Subheadings/labels in uppercase
  detailLabel: {
    margin: "0 0 4px",
    fontSize: "11px",
    color: "#666666",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },
  // Monospace booking reference values in detail blocks
  bookingRef: {
    margin: "0 0 20px",
    fontSize: "18px",
    fontWeight: 700 as const,
    color: "#a78bfa",
    fontFamily: "monospace",
    letterSpacing: "1.5px",
  },
  // Monospace booking reference values in referenceCard
  referenceValue: {
    margin: "0",
    fontSize: "20px",
    fontWeight: 700 as const,
    color: "#a78bfa",
    fontFamily: "monospace",
    letterSpacing: "2px",
  },
  // Standard text value style in details box
  detailValueText: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#e0e0e0",
  },
  // Highlighted white text for inline markup
  whiteText: {
    color: "#ffffff",
  },
  // Event title style inside details box
  eventTitle: {
    margin: "0 0 20px",
    fontSize: "16px",
    fontWeight: 700 as const,
    color: "#ffffff",
  },
  // Large full refund amounts
  fullRefundAmount: {
    margin: "0 0 20px",
    fontSize: "22px",
    fontWeight: 900 as const,
    color: "#ef4444",
  },
  // Large partial refund amounts
  partialRefundAmount: {
    margin: "0 0 20px",
    fontSize: "22px",
    fontWeight: 900 as const,
    color: "#f59e0b",
  },
  // Generic body text styling
  bodyText: {
    margin: "0 0 16px",
    fontSize: "14px",
    color: "#a0a0a0",
    lineHeight: "1.5",
  },
};

// Inline Styles
const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  borderRadius: "16px",
  border: "1px solid #2a2a2a",
  padding: "32px",
};

const badgeContainer: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const baseBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "999px",
  padding: "6px 20px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.5px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  textAlign: "center" as const,
  fontFamily: "Outfit, sans-serif",
};

const titleStyleWithSubtitle: React.CSSProperties = {
  ...titleStyle,
  margin: "0 0 8px",
};

const subtitleStyle: React.CSSProperties = {
  margin: "0 0 28px",
  fontSize: "14px",
  color: "#888888",
  textAlign: "center" as const,
};

const greetingStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "15px",
  color: "#c0c0c0",
  lineHeight: "1.5",
};
