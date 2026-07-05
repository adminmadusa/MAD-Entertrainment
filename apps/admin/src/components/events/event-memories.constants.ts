import { EventMemoryPublicationState } from '@mad/shared';

// ─── Shared Design Token ─────────────────────────────────────────────────────

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple/30 transition-colors';

// ─── Publication State Metadata ──────────────────────────────────────────────

export const STATE_LABELS: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'Draft',
  [EventMemoryPublicationState.PREVIEW]: 'Preview',
  [EventMemoryPublicationState.PUBLISHED]: 'Published',
  [EventMemoryPublicationState.HIDDEN]: 'Hidden',
};

export const STATE_BADGE: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'bg-white/10 text-text-muted border border-white/5',
  [EventMemoryPublicationState.PREVIEW]: 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
  [EventMemoryPublicationState.PUBLISHED]: 'bg-green-500/20 text-green-400 border border-green-500/30',
  [EventMemoryPublicationState.HIDDEN]: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
};

export const STATE_ACTIVE: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'bg-white/15 text-white ring-2 ring-white/30',
  [EventMemoryPublicationState.PREVIEW]: 'bg-accent-purple/35 text-accent-purple ring-2 ring-accent-purple/50',
  [EventMemoryPublicationState.PUBLISHED]: 'bg-green-500/35 text-green-300 ring-2 ring-green-500/50',
  [EventMemoryPublicationState.HIDDEN]: 'bg-yellow-500/25 text-yellow-300 ring-2 ring-yellow-500/40',
};

export const STATE_HINT: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]:
    'Saved as draft. Not visible to the public.',
  [EventMemoryPublicationState.PREVIEW]:
    'Accessible via preview link only. Not indexed publicly.',
  [EventMemoryPublicationState.PUBLISHED]:
    'Live and visible to all visitors on the event page.',
  [EventMemoryPublicationState.HIDDEN]:
    'Hidden from public view. Original publish date is preserved.',
};
