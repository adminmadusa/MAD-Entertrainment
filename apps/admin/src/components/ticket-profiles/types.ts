import { TicketTier } from '@mad/shared';
import { type TicketGroup } from '@mad/types';

export interface TicketInput {
  tier: TicketTier;
  name: string;
  description: string;
  price: number | '';
  isFree: boolean;
  totalCapacity: number | '';
  minPerBooking: number | '';
  maxPerBooking: number | '';
  groupSize: number | '';
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | '';
  minQtyRequired: number | '';
  buyQty: number | '';
  freeTicketQty: number | '';
  isActive: boolean;
}

export interface GroupInput {
  name: string;
  slug: string;
  description: string;
  tickets: TicketInput[];
}

export const defaultTicket = (): TicketInput => ({
  tier: TicketTier.GENERAL,
  name: 'General Admission',
  description: '',
  price: '',
  isFree: false,
  totalCapacity: '',
  minPerBooking: 1,
  maxPerBooking: 10,
  groupSize: 1,
  discountType: 'none',
  discountValue: '',
  minQtyRequired: 1,
  buyQty: '',
  freeTicketQty: '',
  isActive: true,
});

export const defaultGroup = (): GroupInput => ({
  name: 'General Passes',
  slug: 'general-passes',
  description: '',
  tickets: [defaultTicket()],
});

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors';

export const miniInputCls =
  'w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple';

// Shared Validation Rules
export function validateTicketProfile(name: string, groups: GroupInput[]): string | null {
  if (!name.trim()) return 'Profile name is required.';
  if (groups.length === 0) return 'At least one ticket group is required.';
  for (const g of groups) {
    if (g.tickets.length === 0) return `Group "${g.name}" must contain at least one ticket tier.`;
    for (const t of g.tickets) {
      if (!t.name.trim()) return `Ticket name is required in group "${g.name}".`;
    }
  }
  return null;
}

// Shared Payload Builder
export function buildTicketProfilePayload(name: string, description: string, groups: GroupInput[]): {
  name: string;
  description?: string;
  groups: TicketGroup[];
} {
  return {
    name: name.trim(),
    description: description.trim() || undefined,
    groups: groups.map((g) => ({
      name: g.name.trim(),
      slug: g.slug.trim() || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: g.description.trim() || undefined,
      tickets: g.tickets.map((t) => ({
        tier: t.tier,
        name: t.name.trim(),
        description: t.description.trim() || undefined,
        price: t.isFree ? 0 : Number(t.price || 0),
        isFree: t.isFree,
        totalCapacity: Number(t.totalCapacity || 100),
        minPerBooking: Number(t.minPerBooking || 1),
        maxPerBooking: Number(t.maxPerBooking || 10),
        groupSize: Number(t.groupSize || 1),
        isActive: t.isActive,
        offerRules: t.discountType !== 'none'
          ? {
              discountType: t.discountType,
              discountValue: Number(t.discountValue || 0),
              minQtyRequired: Number(t.minQtyRequired || 1),
              buyQty: t.buyQty ? Number(t.buyQty) : undefined,
              freeTicketQty: t.freeTicketQty ? Number(t.freeTicketQty) : undefined,
            }
          : undefined,
      })),
    })),
  };
}
