import { describe, expect, it } from 'vitest';

import { buildTicketProfile } from '../../test-utils/forms/ticket-profile.fixtures';

import {
  getDefaultTicketProfileFormValues,
  mapTicketProfileFormToPayload,
  mapTicketProfileToFormValues,
} from './ticket-profile-form.mapper';

describe('ticket-profile-form.mapper', () => {
  it('maps ticket profile to form values', () => {
    const profile = buildTicketProfile();
    const values = mapTicketProfileToFormValues(profile);
    expect(values.name).toBe('Standard Profile');
    expect(values.groups.length).toBe(1);
    expect(values.groups[0].tickets[0].tier).toBe('general');
  });

  it('maps form values to API payload', () => {
    const values = getDefaultTicketProfileFormValues();
    values.name = 'Mapped Profile';
    values.groups[0].name = 'General';
    values.groups[0].tickets[0].name = 'GA';
    values.groups[0].tickets[0].price = 499;
    values.groups[0].tickets[0].totalCapacity = 50;

    const payload = mapTicketProfileFormToPayload(values);
    expect(payload.name).toBe('Mapped Profile');
    expect(payload.groups[0].tickets[0].price).toBe(499);
    expect(payload.groups[0].tickets[0].totalCapacity).toBe(50);
  });
});
