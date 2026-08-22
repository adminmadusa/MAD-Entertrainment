import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import React from 'react';

import { AdminShell } from '@/components/AdminShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Providers } from '@/providers';

import '@/styles/globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: { default: 'Admin — MAD Entertainments', template: '%s | Admin' },
  description: 'Event Management & Administration System',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
      <body className="bg-background text-text-primary antialiased" suppressHydrationWarning>
        <Providers>
          <ErrorBoundary>
            <AdminShell>{children}</AdminShell>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
