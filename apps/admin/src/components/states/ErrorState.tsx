// src/components/states/ErrorState.tsx
"use client";
import React from "react";

interface Props {
  message?: string;
  retry?: () => void;
}

export default function ErrorState({
  message = "Something went wrong.",
  retry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text-muted">
      <svg
        className="h-12 w-12 mb-4 text-red-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12" y2="16" />
      </svg>
      <p className="mb-4 text-center">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}
