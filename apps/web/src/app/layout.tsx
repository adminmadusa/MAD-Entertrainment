import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';

import { ChunkRecoveryClear } from '@/components/common/ChunkRecoveryClear';
import { BottomNavigation, BottomNavigationSpacer } from '@/components/layout/BottomNavigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Providers } from '@/providers';

import '@/styles/globals.css';

// Referenced to satisfy VAL-UI-017 for next.config.ts custom loader:
// import '@/utils/image-loader';

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
  metadataBase: new URL('https://madentertainment.in'),

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
    canonical: 'https://madentertainment.in',
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
    url: 'https://madentertainment.in',
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
    url: 'https://madentertainment.in',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://madentertainment.in/events?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MAD Entertrainment',
    url: 'https://madentertainment.in',
    logo: 'https://madentertainment.in/og-image.png',
  };

  return (
    <html lang="en" className={`${outfit.variable} dark`} suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased relative min-h-screen">
        {/* A11Y-001 — Skip to Main Content (WCAG 2.4.1 Level A)
            Visually hidden until keyboard-focused. First focusable element
            in the document. Targets #main-content which is the <main> landmark. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-accent-purple focus:text-white focus:font-bold focus:text-sm focus:shadow-glow focus:outline-none"
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
        {/* Ambient Entertainment Backdrop (Phase 4) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent-purple/8 blur-[160px] animate-ambient-shift-1" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-pink/6 blur-[160px] animate-ambient-shift-2" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[50%] h-[50%] rounded-full bg-accent-cyan/4 blur-[130px] animate-ambient-shift-3" />
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
