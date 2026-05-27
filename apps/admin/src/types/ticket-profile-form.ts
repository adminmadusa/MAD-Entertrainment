import { TicketProfile } from '@mad/types';

export type TicketProfileFormMode = 'create' | 'edit';

export interface TicketProfileTicketFormValues {
  tier: string;
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

export interface TicketProfileGroupFormValues {
  name: string;
  slug: string;
  description: string;
  tickets: TicketProfileTicketFormValues[];
}

export interface TicketProfileFormValues {
  name: string;
  description: string;
  groups: TicketProfileGroupFormValues[];
}

export type TicketProfileMutationPayload = Pick<TicketProfile, 'name' | 'description' | 'groups'>;
