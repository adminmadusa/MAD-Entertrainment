import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Preview,
} from "@react-email/components";
import * as React from "react";

import { renderTemplate } from "../render-template";

export interface MagicLinkEmailData {
  email: string;
  magicLinkUrl?: string;
  otpCode: string;
}

const previewData: MagicLinkEmailData = {
  email: "user@example.com",
  otpCode: "123456",
};

interface MagicLinkEmailProps {
  data?: MagicLinkEmailData;
}

export default function MagicLinkEmail({ data = previewData }: MagicLinkEmailProps) {
  const { otpCode } = data;

  // Format OTP as XXX XXX for readability
  const formattedOtp =
    otpCode.length === 6 ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` : otpCode;

  return (
    <Html lang="en">
      <Head />
      <Preview>Sign in to MAD Entertainment</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={brandStyle}>MAD Entertainment</Heading>
          </Section>

          {/* Card Content */}
          <Section style={cardStyle}>
            <Heading style={titleStyle}>Verify Your Login</Heading>
            <Text style={textStyle}>
              You requested a secure login to MAD Entertainment. Please enter the 6-digit passcode below to sign in:
            </Text>

            <Section style={otpCardStyle}>
              <Text style={otpValueStyle}>{formattedOtp}</Text>
            </Section>

            <Text style={subtextStyle}>
              This passcode is temporary and will expire in 15 minutes.
            </Text>

            <Text style={footerWarningStyle}>
              If you didn&apos;t request this login, you can safely ignore this email. Your account
              remains secure.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              &copy; {new Date().getFullYear()} MAD Entertainment. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function magicLinkHtml(data: MagicLinkEmailData): Promise<string> {
  return renderTemplate(<MagicLinkEmail data={data} />);
}

// Inline Styles
const bodyStyle: React.CSSProperties = {
  backgroundColor: "#0d0d0d",
  fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: "0",
  padding: "0",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "24px 16px",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  paddingBottom: "24px",
  borderBottom: "1px solid #2a2a2a",
  marginBottom: "24px",
};

const brandStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "20px",
  fontWeight: 900,
  color: "#a78bfa",
  letterSpacing: "0.05em",
  fontFamily: "Outfit, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  borderRadius: "16px",
  border: "1px solid #2a2a2a",
  padding: "32px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  textAlign: "center" as const,
  lineHeight: "1.3",
  fontFamily: "Outfit, sans-serif",
};

const textStyle: React.CSSProperties = {
  margin: "0 0 24px",
  fontSize: "15px",
  color: "#c0c0c0",
  lineHeight: "1.5",
  textAlign: "center" as const,
};


const subtextStyle: React.CSSProperties = {
  margin: "0 0 28px",
  fontSize: "13px",
  color: "#888888",
  lineHeight: "1.5",
  textAlign: "center" as const,
};


const otpCardStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const otpValueStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "24px",
  fontWeight: 700,
  color: "#a78bfa",
  fontFamily: "monospace",
  letterSpacing: "4px",
};

const footerWarningStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "12px",
  color: "#666666",
  lineHeight: "1.5",
  textAlign: "center" as const,
};

const footerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  paddingTop: "24px",
  borderTop: "1px solid #2a2a2a",
  marginTop: "24px",
};

const footerTextStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "11px",
  color: "#555555",
  lineHeight: "1.5",
};
