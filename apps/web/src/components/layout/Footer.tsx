'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/providers/AuthProvider';
import { useCookieConsent } from '@/providers/CookieConsentProvider';
import { BrandLogo } from '@mad/ui';

const footerSections = {
  Legal: [
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'Refund & Cancellation', href: '/legal/refunds' },
    { label: 'Ticketing Policy', href: '/legal/ticketing' },
    { label: 'Payment Policy', href: '/legal/payment' },
    { label: 'Cookie Policy', href: '/legal/cookies' },
    { label: 'Data & Account Deletion', href: '/legal/data-deletion' },
  ],
  Compliance: [
    { label: 'Accessibility Statement', href: '/legal/accessibility' },
    { label: 'Security Disclosure', href: '/legal/security' },
    { label: 'DMCA & Copyright', href: '/legal/dmca' },
    { label: 'California Privacy Notice', href: '/legal/california-privacy' },
    { label: 'US State Privacy Rights', href: '/legal/state-privacy' },
  ],
  Communications: [
    { label: 'SMS & Messaging Terms', href: '/legal/sms-terms' },
    { label: 'Communication Preferences', href: '/legal/communication-preferences' },
  ],
  Support: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'Help Center', href: '/support' },
    { label: 'My Tickets', href: '/tickets' },
    { label: 'Browse Events', href: '/events' },
  ],
};

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com', icon: <InstagramIcon /> },
  { label: 'YouTube', href: 'https://youtube.com', icon: <YouTubeIcon /> },
  { label: 'Twitter', href: 'https://twitter.com', icon: <TwitterIcon /> },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const isCheckoutOrBook = pathname?.startsWith('/checkout/');
  const { isAuthenticated } = useAuth();
  const { openPreferences } = useCookieConsent();

  const myTicketsHref = isAuthenticated ? '/dashboard?tab=tickets' : '/tickets';

  if (isCheckoutOrBook) return null;

  return (
    <footer className="bg-background-secondary border-t border-border-subtle mt-12 md:mt-20">
      {/* Main Footer Content */}
      <div className="container-mad py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">
          {/* Brand & Geographic Notice */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="flex items-center mb-4 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background w-fit"
            >
              <BrandLogo size="md" imageSrc="/brand/logo-64.png" />
            </Link>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4">
              Premium live entertainment booking platform for concerts, festivals, and unforgettable events across the United States.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-text-secondary mb-6">
              <span>🇺🇸</span>
              <span>United States Only</span>
            </div>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="p-2.5 glass rounded-xl border border-border-subtle hover:border-accent-purple hover:text-accent-purple-light transition-all duration-200 text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-text-primary font-semibold text-xs uppercase tracking-wider mb-3.5">
              Legal
            </h3>
            <ul className="space-y-2">
              {footerSections.Legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-xs hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance Column */}
          <div>
            <h3 className="text-text-primary font-semibold text-xs uppercase tracking-wider mb-3.5">
              Compliance
            </h3>
            <ul className="space-y-2">
              {footerSections.Compliance.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-xs hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-text-secondary text-xs hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded block py-0.5 text-left cursor-pointer"
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>

          {/* Communications Column */}
          <div>
            <h3 className="text-text-primary font-semibold text-xs uppercase tracking-wider mb-3.5">
              Communications
            </h3>
            <ul className="space-y-2">
              {footerSections.Communications.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-xs hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-text-primary font-semibold text-xs uppercase tracking-wider mb-3.5">
              Support
            </h3>
            <ul className="space-y-2">
              {footerSections.Support.map((link) => {
                const href = link.label === 'My Tickets' ? myTicketsHref : link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={href}
                      className="text-text-secondary text-xs hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded block py-0.5"
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Security Bar */}
      <div className="border-t border-border-subtle bg-black/20">
        <div className="container-mad py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs leading-relaxed" suppressHydrationWarning>
            © {currentYear} MAD Entertainment LLC. All rights reserved. • United States Only
          </p>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-xs">
              Secured by <span className="text-accent-purple font-semibold">Stripe</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="#0B0F1A" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
