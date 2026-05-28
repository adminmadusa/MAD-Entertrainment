"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report fatal crashes to Sentry when DSN is configured.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    } else {
      console.error("[MAD Global Error]", error);
    }
  }, [error]);

  return (
    <div
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#0B0F1A",
        color: "#E2E8F0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔇</div>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.5rem" }}>
        Critical Error
      </h1>
      <p
        style={{
          color: "#94a3b8",
          marginBottom: "1.5rem",
          maxWidth: "400px",
        }}
      >
        The app encountered a fatal error and could not recover. Please try
        refreshing the page.
        {error?.digest && (
          <span
            style={{
              display: "block",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              color: "#64748b",
            }}
          >
            ID: {error.digest}
          </span>
        )}
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "linear-gradient(135deg, #7c3aed, #ec4899)",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
