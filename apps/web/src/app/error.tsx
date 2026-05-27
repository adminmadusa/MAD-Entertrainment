"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to your error tracking service here (e.g. Sentry)
    console.error("[MAD Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-pink/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md space-y-6">
        {/* Icon */}
        <div className="text-6xl animate-pulse">🎛️</div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-white">
          Something Went <span className="text-gradient">Wrong</span>
        </h1>

        <p className="text-text-secondary text-sm leading-relaxed">
          The DJ dropped the laptop. An unexpected error crashed the page.
          {error?.digest && (
            <span className="block mt-2 font-mono text-xs text-text-muted">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow text-sm"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 glass border border-border-subtle text-white font-semibold rounded-xl hover:border-accent-purple/40 transition-all text-sm"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
