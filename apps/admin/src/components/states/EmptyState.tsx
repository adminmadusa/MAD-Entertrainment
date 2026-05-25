// src/components/states/EmptyState.tsx
'use client';
import React from 'react';

interface Props {
  message?: string;
}

export default function EmptyState({ message = 'No data available.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text-muted">
      <svg className="h-12 w-12 mb-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
      <p className="text-center">{message}</p>
    </div>
  );
}
