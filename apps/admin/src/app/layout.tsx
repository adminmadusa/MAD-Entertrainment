import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import React from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorBoundary from '@/components/ErrorBoundary';
import NavigationTracker from '@/components/NavigationTracker';
import '@/lib/observability';

import { AdminShell } from '@/components/admin-shell';
import { Providers } from '@/providers';
import '@/styles/globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: { default: 'Admin — MAD Entertrainment', template: '%s | Admin' },
  description: 'Event Management & Administration System',
  manifest: '/manifest.json',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${outfit.variable} dark`} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-background text-text-primary antialiased">
        <NavigationTracker />
        <Providers>
          <ErrorBoundary>
            <AdminShell>{children}</AdminShell>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
