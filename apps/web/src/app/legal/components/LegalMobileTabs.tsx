'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { legalDocuments } from '@/content/legalDocuments';

export function LegalMobileTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden flex overflow-x-auto snap-x hide-scrollbar gap-2 mb-6 pb-2"
      aria-label="Legal Center Navigation"
    >
      {legalDocuments.map((doc) => {
        const isActive = pathname === `/legal/${doc.slug}`;

        return (
          <Link
            key={doc.slug}
            href={`/legal/${doc.slug}`}
            className={[
              'snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border',
              isActive
                ? 'bg-accent-purple border-accent-purple text-white shadow-glow-sm'
                : 'bg-white/5 border-border-subtle text-text-secondary hover:text-white'
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {doc.title}
          </Link>
        );
      })}
    </nav>
  );
}
