import * as React from "react";
import { Section, Text, Link } from "@react-email/components";

export function EmailFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Section style={footerStyle}>
      <Text style={questionStyle}>
        Questions? Reply to this email or contact{" "}
        <Link href="mailto:adminmadusa@gmail.com" style={linkStyle}>
          support
        </Link>
        .
      </Text>
      <Text style={copyrightStyle}>
        &copy; {currentYear} MAD Entertrainment. All rights reserved.
      </Text>
    </Section>
  );
}

const footerStyle: React.CSSProperties = {
  paddingTop: "28px",
  textAlign: "center" as const,
};

const questionStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "12px",
  color: "#444444",
};

const linkStyle: React.CSSProperties = {
  color: "#a78bfa",
  textDecoration: "none",
 };

const copyrightStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "11px",
  color: "#333333",
};
