'use client';

import React, { Component, type ErrorInfo, type ReactNode, Suspense } from 'react';

import { ErrorState } from '@mad/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SectionBoundary error caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="py-12 px-4 flex justify-center items-center w-full">
          <ErrorState
            title="Failed to Load Section"
            description="We encountered an issue loading this section of the page. Please check your connection and try again."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

interface SectionBoundaryProps {
  children: ReactNode;
  loadingFallback: ReactNode;
  errorFallback?: ReactNode;
}

export function SectionBoundary({ children, loadingFallback, errorFallback }: SectionBoundaryProps) {
  return (
    <SectionErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </SectionErrorBoundary>
  );
}
