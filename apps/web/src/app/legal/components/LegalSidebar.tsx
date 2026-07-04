'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { legalDocuments } from '@/content/legalDocuments';
import { LegalSupportCard } from './LegalSupportCard';

export function LegalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-[280px] shrink-0 sticky top-24 self-start h-[calc(100vh-8rem)] overflow-y-auto hide-scrollbar pr-4 pb-12">
      <h2 className="text-white font-bold text-lg mb-6">Legal Center</h2>
      <nav className="flex flex-col gap-2 mb-8">
        {legalDocuments.map((doc) => {
          const isActive = pathname === `/legal/${doc.slug}`;

          return (
            <Link
              key={doc.slug}
              href={`/legal/${doc.slug}`}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border',
                isActive
                  ? 'bg-white/10 border-accent-purple text-white font-medium shadow-glow-sm'
                  : 'border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary'
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg opacity-80" aria-hidden="true">{doc.icon}</span>
              <span className="text-sm">{doc.title}</span>
            </Link>
          );
        })}
      </nav>
      <LegalSupportCard />
    </aside>
  );
}
