import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { getPublicWebUrl } from "../../../../config/env";

export function EmailHeader() {
  let webUrl = "https://www.madentertainments.net";
  try {
    webUrl = getPublicWebUrl();
  } catch {
    // Graceful fallback for offline template rendering or uninitialized env tests
  }
  const logoUrl = `${webUrl}/brand/email-logo.png`;

  return (
    <Section style={headerStyle}>
      <Link href={webUrl} style={{ textDecoration: "none", display: "inline-block" }}>
        <table align="center" border={0} cellPadding={0} cellSpacing={0} style={logoTableStyle}>
          <tbody>
            <tr>
              <td align="center" style={{ verticalAlign: "middle", paddingRight: "12px" }}>
                <Img
                  src={logoUrl}
                  alt="MAD Entertainments"
                  width="44"
                  height="44"
                  style={logoImgStyle}
                />
              </td>
              <td align="left" style={{ verticalAlign: "middle" }}>
                <Text style={textStyle}>
                  <span style={boldStyle}>MAD</span>
                  <span style={lightStyle}> Entertrainment</span>
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Link>
    </Section>
  );
}

const headerStyle: React.CSSProperties = {
  paddingBottom: "28px",
  textAlign: "center" as const,
};

const logoTableStyle: React.CSSProperties = {
  margin: "0 auto",
};

const logoImgStyle: React.CSSProperties = {
  display: "block",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  backgroundColor: "#000000",
};

const textStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "22px",
  lineHeight: "1",
};

const boldStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#ffffff",
  letterSpacing: "-0.5px",
};

const lightStyle: React.CSSProperties = {
  fontWeight: 400,
  color: "#a78bfa",
};
