import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';

import { ChunkRecoveryClear } from '@/components/common/ChunkRecoveryClear';
import { BottomNavigation, BottomNavigationSpacer } from '@/components/layout/BottomNavigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Providers } from '@/providers';

import '@/styles/globals.css';

// ─── Fonts ────────────────────────────────────────────────────

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

// ─── Metadata ─────────────────────────────────────────────────

export const metadata: Metadata = {
  /**
   * metadataBase is required for Next.js to resolve relative URLs in OG images
   * across all pages. Without it, opengraph-image paths are left unresolved.
   */
  metadataBase: new URL('https://www.madentertainments.net'),

  title: {
    default: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    template: '%s | MAD Entertrainment',
  },
  description:
    'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances. Premium entertainment booking platform.',
  keywords: [
    'MAD Entertrainment',
    'ticket booking',
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
  alternates: {
    canonical: 'https://www.madentertainments.net',
  },
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
    url: 'https://www.madentertainments.net',
    locale: 'en_IN',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MAD Entertrainment — Premium Ticket Booking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    description:
      'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances.',
    images: ['/og-image.png'],
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
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MAD Entertrainment',
    url: 'https://www.madentertainments.net',
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MAD Entertrainment',
    url: 'https://www.madentertainments.net',
    logo: 'https://www.madentertainments.net/og-image.png',
  };

  return (
    <html lang="en" className={`${outfit.variable} dark`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased relative min-h-screen" suppressHydrationWarning>
        {/* A11Y-001 — Skip to Main Content (WCAG 2.4.1 Level A)
            Visually hidden until keyboard-focused. First focusable element
            in the document. Targets #main-content which is the <main> landmark. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-dialog focus:px-4 focus:py-2 focus:rounded-xl focus:bg-accent-purple focus:text-white focus:font-bold focus:text-sm focus:shadow-glow focus:outline-none"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ChunkRecoveryClear />
        {/* Ambient Entertainment Backdrop (Optimized static gradients, 0 GPU compositing overhead) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 15%, rgba(124, 58, 237, 0.08) 0%, transparent 55%),
                radial-gradient(circle at 85% 85%, rgba(236, 72, 153, 0.06) 0%, transparent 55%),
                radial-gradient(circle at 50% 45%, rgba(6, 182, 212, 0.04) 0%, transparent 50%)
              `,
            }}
          />
          <div className="absolute inset-0 noise-overlay opacity-[0.25]" />
        </div>

        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-screen relative">
            {children}
            <BottomNavigationSpacer />
          </main>
          <BottomNavigation />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
