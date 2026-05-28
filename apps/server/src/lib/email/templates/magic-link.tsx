import * as React from "react";
import { Section, Text, Button, Heading } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeader } from "./components/EmailHeader";
import { EmailFooter } from "./components/EmailFooter";
import { renderTemplate } from "../render-template";

export interface MagicLinkEmailData {
  email: string;
  magicLinkUrl: string;
  otpCode: string;
}

const previewData: MagicLinkEmailData = {
  email: "user@example.com",
  magicLinkUrl: "http://localhost:3000/auth/verify?token=preview_token",
  otpCode: "123456",
};

interface MagicLinkEmailProps {
  data?: MagicLinkEmailData;
}

export default function MagicLinkEmail({ data = previewData }: MagicLinkEmailProps) {
  const { email, magicLinkUrl, otpCode } = data;

  // Format OTP as XXX XXX for readability
  const formattedOtp = otpCode.length === 6 
    ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` 
    : otpCode;

  return (
    <EmailLayout previewText="Sign in to MAD Entertainment">
      <EmailHeader />

      <Section style={cardStyle}>
        <Heading style={titleStyle}>Verify Your Login</Heading>
        <Text style={textStyle}>
          You requested a secure login to MAD Entertainment. Click the button below to sign in instantly.
        </Text>

        <Section style={buttonContainer}>
          <Button href={magicLinkUrl} style={buttonStyle}>
            Sign In Instantly
          </Button>
        </Section>

        <Text style={subtextStyle}>
          This link will expire in 15 minutes. If the button doesn't work, you can copy and paste the following URL into your browser:
          <br />
          <a href={magicLinkUrl} style={linkStyle}>{magicLinkUrl}</a>
        </Text>

        <Section style={dividerStyle} />

        <Heading style={otpTitleStyle}>One-Time Passcode</Heading>
        <Text style={textStyle}>
          If you are on a different device or need an OTP, enter the 6-digit passcode below:
        </Text>

        <Section style={otpCardStyle}>
          <Text style={otpValueStyle}>{formattedOtp}</Text>
        </Section>

        <Text style={footerWarningStyle}>
          If you didn't request this login, you can safely ignore this email. Your account remains secure.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  );
}

export async function magicLinkHtml(data: MagicLinkEmailData): Promise<string> {
  return renderTemplate(<MagicLinkEmail data={data} />);
}

// Inline Styles
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

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#8b5cf6",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 30px",
  border: "1px solid #7c3aed",
};

const subtextStyle: React.CSSProperties = {
  margin: "0 0 28px",
  fontSize: "13px",
  color: "#888888",
  lineHeight: "1.5",
  textAlign: "center" as const,
};

const linkStyle: React.CSSProperties = {
  color: "#a78bfa",
  textDecoration: "underline",
  wordBreak: "break-all" as any,
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #2a2a2a",
  margin: "24px 0",
};

const otpTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "18px",
  fontWeight: 700,
  color: "#ffffff",
  textAlign: "center" as const,
  fontFamily: "Outfit, sans-serif",
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
