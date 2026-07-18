import React from 'react';

import { FormField } from '@mad/ui';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 transition-colors';

export interface EventRequirementsCardProps {
  requireTerms: boolean;
  setRequireTerms: (val: boolean) => void;
  requireAgeConfirmation: boolean;
  setRequireAgeConfirmation: (val: boolean) => void;
  ageRestriction: number | '';
  setAgeRestriction: (val: number | '') => void;
  tags: string;
  setTags: (val: string) => void;
}

export const EventRequirementsCard = React.memo(function EventRequirementsCard({
  requireTerms,
  setRequireTerms,
  requireAgeConfirmation,
  setRequireAgeConfirmation,
  ageRestriction,
  setAgeRestriction,
  tags,
  setTags,
}: EventRequirementsCardProps) {
  return (
    <>
      {/* Options */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Options</h2>
        <FormField label="Tags (comma separated)" htmlFor="event-tags">
          <input
            id="event-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="EDM, outdoor, live"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Registration Requirements */}
      <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-white font-bold text-lg mb-2">Registration Requirements</h3>
        <div className="space-y-4 text-sm">
          <label htmlFor="event-require-terms" className="flex items-center gap-3 cursor-pointer">
            <input
              id="event-require-terms"
              type="checkbox"
              checked={requireTerms}
              onChange={(e) => setRequireTerms(e.target.checked)}
              className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
            />
            <span className="text-text-secondary">Require Terms & Conditions</span>
          </label>
          <label htmlFor="event-require-age" className="flex items-center gap-3 cursor-pointer">
            <input
              id="event-require-age"
              type="checkbox"
              checked={requireAgeConfirmation}
              onChange={(e) => setRequireAgeConfirmation(e.target.checked)}
              className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
            />
            <span className="text-text-secondary">Require Age Confirmation</span>
          </label>
          {requireAgeConfirmation && (
            <div className="pl-7">
              <label htmlFor="event-age-restriction" className="block text-text-secondary mb-2">Age Requirement</label>
              <select
                id="event-age-restriction"
                value={ageRestriction}
                onChange={(e) => setAgeRestriction(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50"
              >
                <option value={18}>18</option>
                <option value={21}>21</option>
                <option value={25}>25</option>
                <option value={30}>30</option>
                <option value="">Custom</option>
              </select>
              {ageRestriction === '' && (
                <input
                  id="event-age-custom"
                  aria-label="Custom Age Requirement"
                  type="number"
                  min="1"
                  placeholder="Enter age"
                  onBlur={(e) => {
                    if (e.target.value) setAgeRestriction(Number(e.target.value));
                  }}
                  className="w-full px-4 py-2 mt-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
