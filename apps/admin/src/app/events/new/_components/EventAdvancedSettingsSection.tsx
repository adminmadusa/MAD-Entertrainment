'use client';

import React from 'react';

import { Field, inputCls } from './Field';

interface EventAdvancedSettingsSectionProps {
  tags: string;
  setTags: (val: string) => void;
  isFeatured: boolean;
  setIsFeatured: (val: boolean) => void;
  requireTerms: boolean;
  setRequireTerms: (val: boolean) => void;
  requireAgeConfirmation: boolean;
  setRequireAgeConfirmation: (val: boolean) => void;
  ageRestriction: number | '';
  setAgeRestriction: (val: number | '') => void;
}

export function EventAdvancedSettingsSection({
  tags,
  setTags,
  isFeatured,
  setIsFeatured,
  requireTerms,
  setRequireTerms,
  requireAgeConfirmation,
  setRequireAgeConfirmation,
  ageRestriction,
  setAgeRestriction,
}: EventAdvancedSettingsSectionProps) {
  return (
    <>
      {/* Options */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">Options</h2>
        <Field label="Tags (comma-separated)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="EDM, outdoor, live"
            className={inputCls}
          />
        </Field>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <span className="text-text-secondary text-sm">Feature on homepage</span>
          </label>
        </div>
      </div>

      {/* Registration Requirements */}
      <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-white font-bold text-lg mb-2">Registration Requirements</h3>
        <div className="space-y-4 text-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireTerms}
              onChange={(e) => setRequireTerms(e.target.checked)}
              className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
            />
            <span className="text-text-secondary">Require Terms & Conditions</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireAgeConfirmation}
              onChange={(e) => setRequireAgeConfirmation(e.target.checked)}
              className="w-4 h-4 rounded bg-background border-white/20 text-accent-purple focus:ring-accent-purple"
            />
            <span className="text-text-secondary">Require Age Confirmation</span>
          </label>
          {requireAgeConfirmation && (
            <div className="pl-7">
              <label className="block text-text-secondary mb-2">Age Requirement</label>
              <select
                value={ageRestriction}
                onChange={(e) =>
                  setAgeRestriction(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="px-4 py-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
              >
                <option value={18}>18</option>
                <option value={21}>21</option>
                <option value={25}>25</option>
                <option value={30}>30</option>
                <option value="">Custom</option>
              </select>
              {ageRestriction === '' && (
                <input
                  type="number"
                  min="1"
                  placeholder="Enter age"
                  onBlur={(e) => {
                    if (e.target.value) setAgeRestriction(Number(e.target.value));
                  }}
                  className="w-full px-4 py-2 mt-2 bg-background border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
