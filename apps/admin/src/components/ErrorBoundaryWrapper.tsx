// src/components/ErrorBoundaryWrapper.tsx
'use client';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

type Props = {
  children: React.ReactNode;
};

export default function ErrorBoundaryWrapper({ children }: Props) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
