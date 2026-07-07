'use client';

import { EventMemoryPublicationState } from '@mad/shared';

import {
  STATE_ACTIVE,
  STATE_HINT,
  STATE_LABELS,
} from './event-memories.constants';

// ─── Props ───────────────────────────────────────────────────────────────────

interface MemoriesPublicationControlsProps {
  publicationState: EventMemoryPublicationState;
  isPreviewLoading: boolean;
  onStateChange: (next: EventMemoryPublicationState) => void;
  onOpenPreview: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ORDERED_STATES = [
  EventMemoryPublicationState.DRAFT,
  EventMemoryPublicationState.PREVIEW,
  EventMemoryPublicationState.PUBLISHED,
  EventMemoryPublicationState.HIDDEN,
] as const;

export function MemoriesPublicationControls({
  publicationState,
  isPreviewLoading,
  onStateChange,
  onOpenPreview,
}: MemoriesPublicationControlsProps) {
  const showPreviewLink =
    publicationState === EventMemoryPublicationState.PREVIEW ||
    publicationState === EventMemoryPublicationState.PUBLISHED;

  return (
    <div className="pt-4 border-t border-white/5 space-y-3">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
        Publication State
      </p>

      <div className="flex flex-wrap gap-2">
        {ORDERED_STATES.map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => onStateChange(state)}
            className={[
              'min-h-[44px] min-w-[70px] px-4 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple',
              publicationState === state
                ? STATE_ACTIVE[state]
                : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary',
            ].join(' ')}
          >
            {STATE_LABELS[state]}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-text-muted">{STATE_HINT[publicationState]}</p>

      {showPreviewLink && (
        <button
          type="button"
          disabled={isPreviewLoading}
          onClick={onOpenPreview}
          className="min-h-[44px] flex items-center gap-1.5 text-xs text-accent-purple hover:text-accent-purple/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple disabled:opacity-50 transition-colors"
        >
          {isPreviewLoading ? (
            <span className="animate-spin inline-block w-3 h-3 border-t-2 border-accent-purple rounded-full" />
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          )}
          Open event page preview
        </button>
      )}
    </div>
  );
}
