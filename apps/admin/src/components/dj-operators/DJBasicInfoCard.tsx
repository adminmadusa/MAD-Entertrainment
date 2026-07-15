import React from 'react';

import { FormField, Input, Textarea } from '@mad/ui';

import type { DJBasicInfoCardProps } from './utils';

// Re-export FormField as Field to maintain backward compatibility with DJSocialLinksCard
export { FormField as Field };


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
      <FormField label="DJ Name / Stage Name *" htmlFor="dj-name">
        <Input
          id="dj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. DJ Shaan"
          required
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={isEdit ? 'Slug' : 'Slug (optional)'} htmlFor="dj-slug">
          <Input
            id="dj-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. dj-shaan"
          />
        </FormField>
        <FormField label="Specialties / Genres (comma-separated)" htmlFor="dj-specialties">
          <Input
            id="dj-specialties"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="e.g. Techno, House, Progressive"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Experience (Years)" htmlFor="dj-experience-years">
          <Input
            id="dj-experience-years"
            type="number"
            min="0"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            placeholder="e.g. 5"
          />
        </FormField>
      </div>
      <FormField label="Bio (optional)" htmlFor="dj-bio">
        <Textarea
          id="dj-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Describe the DJ's profile, residency status, and gigs..."
          rows={4}
          className="resize-none"
        />
      </FormField>
    </div>
  );
};
