import { AdminEvent, CloudinaryImage } from '@/lib/api/admin/event.service';

export type EventFormMode = 'create' | 'edit';
export type TicketingType = 'custom' | 'profile';

export interface TicketTierFormValues {
  name: string;
  price: number | '';
  capacity: number | '';
  groupSize: number | '';
  minPerBooking: number | '';
  discount: number | '';
  taxPercent: number | '';
  startDate: string;
  endDate: string;
  description: string;
  isAvailable: boolean;
}

export interface TicketOverrideValue {
  totalCapacity?: number;
  isActive?: boolean;
}

export interface EventFormValues {
  title: string;
  description: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  tags: string;
  isFeatured: boolean;
  isAgeRestricted: boolean;
  minimumAge: number;
  coverImage: CloudinaryImage | null;
  venueName: string;
  organizerName: string;
  refundPolicy: string;
  highlightsInput: string;
  tiers: TicketTierFormValues[];
  ticketingType: TicketingType;
  selectedProfileId: string;
  overrides: Record<string, TicketOverrideValue>;
}

export interface EventMutationPayload extends Partial<AdminEvent> {
  bookingMode: string;
  showTime?: string;
  organizerName?: string;
  refundPolicy?: string;
  highlights?: string[];
  bannerImage?: CloudinaryImage;
  ticketProfileId?: string | null;
  ticketOverrides?: Array<{ tier: string; totalCapacity?: number; isActive?: boolean }>;
  ticketTiers?: Array<{
    name: string;
    price: number;
    capacity: number;
    groupSize: number;
    minPerBooking: number;
    discount: number;
    taxPercent: number;
    isAvailable: boolean;
    tier: string;
    slug: string;
    totalCapacity: number;
  }>;
}
