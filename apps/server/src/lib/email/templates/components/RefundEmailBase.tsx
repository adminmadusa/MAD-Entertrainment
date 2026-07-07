import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFooter } from "./EmailFooter";
import { EmailHeader } from "./EmailHeader";
import { EmailLayout } from "./EmailLayout";

export interface RefundEmailField {
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
}

export interface RefundEmailBaseProps {
  previewText: string;
  badgeText: string;
  badgeStyle: React.CSSProperties;
  title: string;
  description: React.ReactNode;
  fields: RefundEmailField[];
}

export const sharedStyles = {
  bookingRef: {
    margin: "0 0 20px",
    fontSize: "18px",
    fontWeight: 700 as const,
    color: "#a78bfa",
    fontFamily: "monospace",
    letterSpacing: "1.5px",
  },
  eventTitle: {
    margin: "0 0 20px",
    fontSize: "16px",
    fontWeight: 700 as const,
    color: "#ffffff",
  },
  fullRefundAmount: {
    margin: "0 0 20px",
    fontSize: "22px",
    fontWeight: 900 as const,
    color: "#ef4444",
  },
  partialRefundAmount: {
    margin: "0 0 20px",
    fontSize: "22px",
    fontWeight: 900 as const,
    color: "#f59e0b",
  },
  normalValueText: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#e0e0e0",
  },
  whiteText: {
    color: "#ffffff",
  },
};

export function RefundEmailBase({
  previewText,
  badgeText,
  badgeStyle,
  title,
  description,
  fields,
}: RefundEmailBaseProps) {
  return (
    <EmailLayout previewText={previewText}>
      <EmailHeader />

      <Section style={cardStyle}>
        <Section style={badgeContainer}>
          <Text style={{ ...baseBadgeStyle, ...badgeStyle }}>{badgeText}</Text>
        </Section>

        <Heading style={titleStyle}>{title}</Heading>

        <Text style={greetingStyle}>{description}</Text>

        <Section style={detailBoxStyle}>
          {fields.map((field, idx) => (
            <React.Fragment key={idx}>
              <Text style={detailLabelStyle}>{field.label}</Text>
              <Text style={field.valueStyle || detailValueTextStyle}>
                {field.value}
              </Text>
            </React.Fragment>
          ))}
        </Section>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

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

const greetingStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "15px",
  color: "#c0c0c0",
  lineHeight: "1.5",
};

const detailBoxStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  padding: "24px",
  marginBottom: "16px",
};

const detailLabelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  color: "#666666",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const detailValueTextStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "14px",
  color: "#e0e0e0",
};
