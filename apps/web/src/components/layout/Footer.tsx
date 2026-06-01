'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const footerLinks = {
  Platform: [
    { label: 'Browse Events', href: '/events' },
    { label: 'DJ Operators', href: '/dj-operators' },
  ],
  Support: [
    { label: 'Help Center', href: '/support' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'My Tickets', href: '/tickets' },
  ],
  Legal: [
    { label: 'Legal Center', href: '/legal' },
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
  const isCheckoutOrBook = pathname?.endsWith('/book') || pathname?.startsWith('/checkout/');

  if (isCheckoutOrBook) return null;


  return (
    <footer className="bg-background-secondary border-t border-border-subtle mt-12 md:mt-20">
      {/* Main Footer */}
      <div className="container-mad py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-black text-sm">M</span>
              </div>
              <span className="text-white font-bold text-lg">
                MAD <span className="text-gradient">Entertrainment</span>
              </span>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs mb-6">
              Premium entertainment booking platform for live events, concerts, DJ nights, comedy shows, and unforgettable experiences.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="p-2.5 glass rounded-xl border border-border-subtle hover:border-accent-purple hover:text-accent-purple-light transition-all duration-200 text-text-secondary"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links (Desktop/Tablet only) */}
          <div className="hidden md:block">
            <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              {footerLinks.Platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-sm hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support and Legal Links (Side-by-side on mobile, separate on desktop) */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-2 lg:col-span-2 lg:contents">
            {/* Support */}
            <div>
              <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                Support
              </h3>
              <ul className="space-y-3">
                {footerLinks.Support.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-text-secondary text-sm hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul className="space-y-3">
                {footerLinks.Legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-text-secondary text-sm hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border-subtle">
        <div className="container-mad py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* suppressHydrationWarning: year is evaluated on both server and client.
              If the server renders Dec 31 and the client hydrates Jan 1, React
              would log a hydration mismatch. Scoped to this single node only. */}
          <p className="text-text-muted text-sm" suppressHydrationWarning>
            © {currentYear} MAD Entertrainment. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-xs">
              Secured by{' '}
              <span className="text-accent-purple">Razorpay</span> &{' '}
              <span className="text-accent-purple">Stripe</span>
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
