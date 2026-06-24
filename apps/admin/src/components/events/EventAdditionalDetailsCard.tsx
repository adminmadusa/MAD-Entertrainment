import React from 'react';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-text-secondary text-sm font-medium block">{label}</label>
      {children}
    </div>
  );
}

export interface EventAdditionalDetailsCardProps {
  organizerName: string;
  setOrganizerName: (val: string) => void;
  highlightsInput: string;
  setHighlightsInput: (val: string) => void;
  refundPolicy: string;
  setRefundPolicy: (val: string) => void;
}

export const EventAdditionalDetailsCard = React.memo(function EventAdditionalDetailsCard({
  organizerName,
  setOrganizerName,
  highlightsInput,
  setHighlightsInput,
  refundPolicy,
  setRefundPolicy,
}: EventAdditionalDetailsCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Additional Details</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Organizer Name">
          <input
            id="event-organizer"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="e.g. Ellen Colby, The MARM Farm"
            className={inputCls}
          />
        </Field>
        <Field label="Highlights (comma separated)">
          <input
            id="event-highlights"
            value={highlightsInput}
            onChange={(e) => setHighlightsInput(e.target.value)}
            placeholder="e.g. 12 hours, In person, Family friendly"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Refund Policy">
        <textarea
          id="event-refund-policy"
          value={refundPolicy}
          onChange={(e) => setRefundPolicy(e.target.value)}
          placeholder="e.g. Refunds up to 7 days before event"
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </Field>
    </div>
  );
});
