'use client';

import { useState } from 'react';

import { Drawer } from '@mad/ui';

type EventOverviewProps = {
  description: string;
  organizerName?: string | null;
};

export function EventOverview({ description, organizerName }: EventOverviewProps) {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  const descriptionPreview = description.length > 150
    ? `${description.substring(0, 150)}...`
    : description;

  return (
    <>
      {/* Organizer card */}
      <div className="glass rounded-2xl border border-white/5 p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-accent-purple-light flex-shrink-0">
          {organizerName?.charAt(0).toUpperCase() || 'M'}
        </div>
        <div>
          <div className="text-sm font-bold text-white">
            {organizerName || 'MAD Organizer'}
          </div>
          <div className="text-xs text-text-muted mt-0.5">Event Organizer</div>
        </div>
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
        className="w-full max-w-md bg-background h-full border-l border-white/10 focus:outline-none"
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
