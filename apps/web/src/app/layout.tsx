import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';

import { PopupManager } from '@/components/common/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Providers } from '@/providers';
import '@/styles/globals.css';

// ─── Fonts ────────────────────────────────────────────────────

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// ─── Metadata ─────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    template: '%s | MAD Entertrainment',
  },
  description:
    'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances. Premium entertainment booking platform.',
  keywords: [
    'MAD Entertrainment',
    'event booking',
    'DJ nights',
    'concerts',
    'live shows',
    'comedy shows',
    'festivals',
    'ticket booking',
    'entertainment',
    'VIP events',
  ],
  authors: [{ name: 'MAD Entertrainment' }],
  creator: 'MAD Entertrainment',
  publisher: 'MAD Entertrainment',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'MAD Entertrainment',
    title: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    description:
      'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances.',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    description:
      'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// ─── Layout ───────────────────────────────────────────────────

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${outfit.variable} dark`} suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">
        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <Footer />
          <PopupManager />
        </Providers>
      </body>
    </html>
  );
}
