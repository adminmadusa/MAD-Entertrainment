export interface LegalDocumentMeta {
  slug: string;
  title: string;
  category: 'Legal' | 'Compliance' | 'Communications';
  icon: string;
  description: string;
  lastUpdated: string;
}

export const legalDocuments: LegalDocumentMeta[] = [
  // ─── Legal & Policies ──────────────────────────────────────────
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    category: 'Legal',
    icon: '📜',
    description: 'How MAD Entertainment collects, utilizes, and protects your personal data in the United States.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    category: 'Legal',
    icon: '⚖️',
    description: 'The legally binding rules, user obligations, and terms governing the use of the platform.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'refunds',
    title: 'Refund & Cancellation',
    category: 'Legal',
    icon: '🎟️',
    description: 'Policies regarding event cancellations, rescheduling, refunds, and ticket purchase protections.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'ticketing',
    title: 'Ticketing Policy',
    category: 'Legal',
    icon: '🎫',
    description: 'Rules for ticket issuance, single-scan QR code admission, venue entry, and transfers.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'payment',
    title: 'Payment Policy',
    category: 'Legal',
    icon: '💳',
    description: 'Accepted US payment methods, billing authorizations, sales taxes, and processor disclosures.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    category: 'Legal',
    icon: '🍪',
    description: 'Information regarding session cookies, analytics tags, and preference tracking technologies.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'data-deletion',
    title: 'Data & Account Deletion',
    category: 'Legal',
    icon: '🗑️',
    description: 'Instructions on requesting the erasure of your personal data and account deletion rights.',
    lastUpdated: '2026-08-20',
  },

  // ─── Compliance & Rights ───────────────────────────────────────
  {
    slug: 'accessibility',
    title: 'Accessibility Statement',
    category: 'Compliance',
    icon: '♿',
    description: 'Our commitment to ADA compliance and digital accessibility conforming to WCAG 2.1 AA.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'security',
    title: 'Security Disclosure',
    category: 'Compliance',
    icon: '🔒',
    description: 'Our platform security safeguards, encryption standards, and responsible vulnerability reporting.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'dmca',
    title: 'DMCA & Copyright',
    category: 'Compliance',
    icon: '©️',
    description: 'Procedures for submitting copyright infringement notices and DMCA designated agent information.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'california-privacy',
    title: 'California Privacy Notice',
    category: 'Compliance',
    icon: '🌴',
    description: 'Notice at collection and statutory privacy rights under CCPA/CPRA for California residents.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'state-privacy',
    title: 'US State Privacy Rights',
    category: 'Compliance',
    icon: '🏛️',
    description: 'Disclosures and rights for residents of Virginia, Colorado, Connecticut, Texas, and other states.',
    lastUpdated: '2026-08-20',
  },

  // ─── Communications ───────────────────────────────────────────
  {
    slug: 'sms-terms',
    title: 'SMS & Messaging Terms',
    category: 'Communications',
    icon: '📱',
    description: 'Terms governing transactional SMS, booking alerts, OTP verifications, and opt-out instructions.',
    lastUpdated: '2026-08-20',
  },
  {
    slug: 'communication-preferences',
    title: 'Communication Preferences',
    category: 'Communications',
    icon: '🔔',
    description: 'How to manage your email newsletters, push notifications, and SMS marketing subscriptions.',
    lastUpdated: '2026-08-20',
  },
];
