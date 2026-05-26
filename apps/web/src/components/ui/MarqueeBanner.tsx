'use client';

import { PublicCategory } from '@/lib/api/public.service';

const getCategoryEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('dj')) return '🎧';
  if (lower.includes('concert') || lower.includes('music') || lower.includes('live')) return '🎵';
  if (lower.includes('comedy') || lower.includes('laugh') || lower.includes('standup')) return '😂';
  if (lower.includes('festival')) return '🎡';
  if (lower.includes('vip') || lower.includes('private')) return '💎';
  if (lower.includes('theatre') || lower.includes('drama')) return '🎭';
  if (lower.includes('cinema') || lower.includes('movie')) return '🎬';
  if (lower.includes('mad')) return '🎪';
  return '✨';
};

export function MarqueeBanner({ initialCategories = [] }: { initialCategories: PublicCategory[] }) {
  const categories = initialCategories;

  const defaultItems = [
    '🎧 DJ NIGHTS',
    '🎵 LIVE CONCERTS',
    '😂 COMEDY SHOWS',
    '🎪 MAD EVENTS',
    '🎡 FESTIVALS',
    '💎 VIP EVENTS',
    '🎭 THEATRE',
    '🎬 CINEMA',
  ];

  const bannerItems = categories.length > 0
    ? categories.map(cat => `${getCategoryEmoji(cat.name)} ${cat.name}`)
    : defaultItems;

  const items = [...bannerItems, ...bannerItems];

  return (
    <section className="py-8 overflow-hidden border-y border-border-subtle bg-background-secondary/50" aria-hidden="true">
      <div className="flex items-center animate-marquee whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="mx-8 text-text-muted text-sm font-semibold uppercase tracking-widest inline-flex items-center gap-2">
            {item}
            <span className="text-accent-purple/40 mx-2">•</span>
          </span>
        ))}
      </div>
    </section>
  );
}
