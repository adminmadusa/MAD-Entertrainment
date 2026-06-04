'use client';

import { FAQ } from '@/content/faqContent';
import { useState } from 'react';

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) {
    return (
      <div className="text-center py-10 bg-white/5 border border-border-subtle rounded-2xl">
        <p className="text-text-secondary text-sm mb-4">No results found.</p>
        <a href="/contact" className="btn-gradient text-white px-6 py-2 rounded-xl text-sm font-semibold inline-block">
          Contact Support
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        
        return (
          <details 
            key={faq.id} 
            className="group glass-strong border border-border-subtle rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
            open={isOpen}
            onClick={(e) => {
              e.preventDefault();
              setOpenId(isOpen ? null : faq.id);
            }}
          >
            <summary className="flex items-center justify-between p-5 cursor-pointer select-none">
              <h3 className="text-white font-medium pr-4">{faq.question}</h3>
              <span className="shrink-0 text-text-muted group-hover:text-white transition-colors">
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            
            <div className="px-5 pb-5 pt-1 text-text-secondary text-sm leading-relaxed border-t border-border-subtle/30 mt-2">
              {/* eslint-disable-next-line react/no-danger */}
              <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
