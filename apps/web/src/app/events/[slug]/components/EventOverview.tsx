'use client';

import { useState } from 'react';

import { Drawer } from '@mad/ui';

type EventOverviewProps = {
  description: string;
  organizerName?: string | null;
  category?: string | null;
};

export function EventOverview({ description, organizerName, category }: EventOverviewProps) {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);



  const descriptionPreview = description.length > 150
    ? `${description.substring(0, 150)}...`
    : description;

  return (
    <>
      {/* Organizer card */}
      <div className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-accent-purple-light flex-shrink-0">
            {organizerName?.charAt(0).toUpperCase() || 'M'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
              <span>{organizerName || 'MAD Organizer'}</span>
              <span className="text-[10px] text-accent-cyan px-2 py-0.5 bg-accent-cyan/10 rounded-full border border-accent-cyan/20">
                Top organizer
              </span>
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              20.5k followers · {category} events
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => alert('Following organizer!')}
          className="flex-shrink-0 px-5 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
        >
          + Follow
        </button>
      </div>

      {/* Overview */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">Overview</h2>
        <div className="text-text-secondary text-sm leading-relaxed">
          <p>{descriptionPreview}</p>
          {description.length > 150 && (
            <button
              type="button"
              onClick={() => setIsOverviewOpen(true)}
              className="text-accent-cyan hover:text-accent-cyan/80 font-semibold inline-flex items-center gap-1 mt-2 hover:underline"
            >
              Read more →
            </button>
          )}
        </div>
      </div>

      {/* Overview Modal Drawer */}
      <Drawer
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        side="right"
        title="Overview"
        className="w-full max-w-md bg-[#0d111d] h-full border-l border-white/10 focus:outline-none"
      >
        <div className="flex flex-col h-full justify-between">
          <div className="overflow-y-auto max-h-[72vh] text-text-secondary text-sm leading-relaxed pr-2 custom-scrollbar">
            {description}
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOverviewOpen(false)}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
