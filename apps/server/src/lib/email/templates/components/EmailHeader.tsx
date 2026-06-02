import * as React from "react";
import { Section, Text } from "@react-email/components";

export function EmailHeader() {
  return (
    <Section style={headerStyle}>
      <Text style={textStyle}>
        <span style={boldStyle}>MAD</span>
        <span style={lightStyle}> Entertrainment</span>
      </Text>
    </Section>
  );
}

const headerStyle: React.CSSProperties = {
  paddingBottom: "32px",
  textAlign: "center" as const,
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
