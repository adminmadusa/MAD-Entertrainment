'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { legalDocuments } from '@/content/legalDocuments';

import { LegalSupportCard } from './LegalSupportCard';

const categoryTitles: Record<string, string> = {
  Legal: 'Legal & Policies',
  Compliance: 'Compliance & Rights',
  Communications: 'Communications',
};

export function LegalSidebar() {
  const pathname = usePathname();

  const categories = ['Legal', 'Compliance', 'Communications'] as const;

  return (
    <aside className="hidden md:block w-[300px] shrink-0 sticky top-24 self-start h-[calc(100vh-8rem)] overflow-y-auto hide-scrollbar pr-4 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold text-lg">Legal Center</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-accent-purple border border-white/10 uppercase tracking-wider">
          US Only
        </span>
      </div>

      <nav className="flex flex-col gap-6 mb-8">
        {categories.map((category) => {
          const docs = legalDocuments.filter((d) => d.category === category);
          if (docs.length === 0) return null;

          return (
            <div key={category} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-3 mb-1">
                {categoryTitles[category]}
              </h3>
              {docs.map((doc) => {
                const isActive = pathname === `/legal/${doc.slug}`;

                return (
                  <Link
                    key={doc.slug}
                    href={`/legal/${doc.slug}`}
                    className={[
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 border text-xs font-medium',
                      isActive
                        ? 'bg-white/10 border-accent-purple text-white shadow-glow-sm'
                        : 'border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-sm opacity-80 shrink-0" aria-hidden="true">{doc.icon}</span>
                    <span className="truncate">{doc.title}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <LegalSupportCard />
    </aside>
  );
}
