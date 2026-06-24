import React from 'react';
import { DJBasicInfoCardProps, inputCls } from './types';

export const Field: React.FC<{ label: string; htmlFor?: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  children,
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-text-secondary text-sm font-medium block">
        {label}
      </label>
      {children}
    </div>
  );
};

export const DJBasicInfoCard: React.FC<DJBasicInfoCardProps> = ({
  name,
  setName,
  slug,
  setSlug,
  specialties,
  setSpecialties,
  bio,
  setBio,
  experienceYears,
  setExperienceYears,
  isEdit = false,
}) => {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Basic Information</h2>
      <Field label="DJ Name / Stage Name *" htmlFor="dj-name">
        <input
          id="dj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. DJ Shaan"
          required
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={isEdit ? 'Slug' : 'Slug (optional)'} htmlFor="dj-slug">
          <input
            id="dj-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. dj-shaan"
            className={inputCls}
          />
        </Field>
        <Field label="Specialties / Genres (comma-separated)" htmlFor="dj-specialties">
          <input
            id="dj-specialties"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="e.g. Techno, House, Progressive"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Experience (Years)" htmlFor="dj-experience-years">
          <input
            id="dj-experience-years"
            type="number"
            min="0"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            placeholder="e.g. 5"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Bio (optional)" htmlFor="dj-bio">
        <textarea
          id="dj-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Describe the DJ's profile, residency status, and gigs..."
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </Field>
    </div>
  );
};
