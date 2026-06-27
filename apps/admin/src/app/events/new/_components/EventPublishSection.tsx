'use client';

import React from 'react';
import { EventStatus } from '@mad/shared';
import { Field, inputCls } from './Field';

interface EventPublishSectionProps {
  status: EventStatus;
  setStatus: (val: EventStatus) => void;
}

export function EventPublishSection({ status, setStatus }: EventPublishSectionProps) {
  return (
    <Field label="Status">
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
    </Field>
  );
}
