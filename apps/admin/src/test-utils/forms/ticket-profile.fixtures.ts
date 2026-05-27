import { TicketProfile } from '@mad/types';

export function buildTicketProfile(overrides: Partial<TicketProfile> = {}): TicketProfile {
  return {
    _id: 'profile_1',
    name: 'Standard Profile',
    description: 'Default ticket profile',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    groups: [
      {
        name: 'General Passes',
        slug: 'general-passes',
        description: '',
        tickets: [
          {
            tier: 'general',
            name: 'General Admission',
            description: '',
            price: 999,
            isFree: false,
            totalCapacity: 100,
            minPerBooking: 1,
            maxPerBooking: 10,
            groupSize: 1,
            isActive: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}
