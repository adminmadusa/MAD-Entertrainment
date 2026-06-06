'use client';

import { useState, useMemo } from 'react';
import { faqContent, FAQCategory } from '@/content/faqContent';
import { FAQAccordion } from './FAQAccordion';

const CATEGORIES: { id: FAQCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Topics', icon: '🔍' },
  { id: 'tickets', label: 'Tickets & Entry', icon: '🎟️' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'refunds', label: 'Refunds', icon: '🔄' },
  { id: 'events', label: 'Events', icon: '🎉' },
  { id: 'accounts', label: 'Account', icon: '👤' },
];

export function SupportHubClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FAQCategory | 'all'>('all');

  const filteredFaqs = useMemo(() => {
    return faqContent.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch = 
        searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const sectionTitle = useMemo(() => {
    if (searchQuery) return 'Search Results';
    if (activeCategory === 'all') return 'Popular Questions';
    return CATEGORIES.find((c) => c.id === activeCategory)?.label || '';
  }, [searchQuery, activeCategory]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      
      {/* Search Header */}
      <section className="text-center space-y-6">
        <h1 className="text-white font-bold text-4xl tracking-tight">How can we help you?</h1>
        <div className="relative max-w-xl mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-border-subtle rounded-full py-4 pl-12 pr-4 text-white placeholder-text-muted focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
          />
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery(''); // Clear search when changing category
              }}
              className={[
                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 border',
                activeCategory === cat.id
                  ? 'bg-accent-purple border-accent-purple text-white shadow-glow-sm'
                  : 'bg-white/5 border-border-subtle text-text-secondary hover:text-white hover:border-white/20'
              ].join(' ')}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ List */}
      <section>
        <h2 className="text-white font-bold text-xl mb-6">
          {sectionTitle}
        </h2>
        <FAQAccordion faqs={filteredFaqs} />
      </section>

      {/* Contact Escalation */}
      <section className="mt-16 text-center bg-accent-purple/10 border border-accent-purple/20 rounded-3xl p-10">
        <h3 className="text-white font-bold text-2xl mb-3">Still need help?</h3>
        <p className="text-text-secondary max-w-lg mx-auto mb-8">
          Our support team is available to help you with ticket recovery, payment disputes, and general inquiries.
        </p>
        <a href="/contact" className="btn-gradient text-white px-8 py-3 rounded-full font-bold shadow-glow inline-block hover:scale-105 transition-transform">
          Contact Support
        </a>
      </section>
      
    </div>
  );
}
