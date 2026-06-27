import { TicketTierInput } from './types';

export const TICKET_TIER_NAMES = [
  'general',
  'silver',
  'gold',
  'platinum',
  'vip',
  'vvip',
  'backstage',
  'couple',
  'group',
  'family',
  'early_bird',
  'custom',
];

export const defaultTier = (): TicketTierInput => ({
  name: 'general',
  price: '',
  capacity: '',
  groupSize: '',
  minPerBooking: '',
  discount: '',
  taxPercent: '',
  startDate: '',
  endDate: '',
  description: '',
  isAvailable: true,
});

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';
