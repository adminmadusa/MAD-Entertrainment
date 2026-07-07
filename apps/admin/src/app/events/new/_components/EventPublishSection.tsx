'use client';

import React from 'react';
import { EventStatus } from '@mad/shared';
import { FormField } from '@mad/ui';
import { inputCls } from './constants';

interface EventPublishSectionProps {
  status: EventStatus;
  setStatus: (val: EventStatus) => void;
}

export function EventPublishSection({ status, setStatus }: EventPublishSectionProps) {
  return (
    <FormField label="Status" htmlFor="event-status">
      <select
        id="event-status"
        value={status}
        onChange={(e) => setStatus(e.target.value as EventStatus)}
        className={inputCls}
      >
        <option value={EventStatus.DRAFT} className="bg-background-card">
          Draft
        </option>
        <option value={EventStatus.PUBLISHED} className="bg-background-card">
          Published
        </option>
      </select>
    </FormField>
  );
}
