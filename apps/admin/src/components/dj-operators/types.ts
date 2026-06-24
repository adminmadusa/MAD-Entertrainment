import React from 'react';
import { ImageAsset } from '@mad/types';
import { extractApiError } from '@/lib/api/client';

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

export function formatApiError(err: unknown): string {
  const apiErr = extractApiError(err);
  if (apiErr.errors) {
    return Object.entries(apiErr.errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
  }
  return apiErr.message;
}

export interface DJBasicInfoCardProps {
  name: string;
  setName: (val: string) => void;
  slug: string;
  setSlug: (val: string) => void;
  specialties: string;
  setSpecialties: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  experienceYears: string;
  setExperienceYears: (val: string) => void;
  isEdit?: boolean;
}

export interface DJMediaCardProps {
  profileImage: ImageAsset | null;
  setProfileImage: (val: ImageAsset | null) => void;
  galleryImages: ImageAsset[];
  setGalleryImages: React.Dispatch<React.SetStateAction<ImageAsset[]>>;
}

export interface DJSocialLinksCardProps {
  instagram: string;
  setInstagram: (val: string) => void;
  soundcloud: string;
  setSoundcloud: (val: string) => void;
  youtube: string;
  setYoutube: (val: string) => void;
  facebook: string;
  setFacebook: (val: string) => void;
  twitter: string;
  setTwitter: (val: string) => void;
  spotify: string;
  setSpotify: (val: string) => void;
  website: string;
  setWebsite: (val: string) => void;
  isActive: boolean;
  setIsActive: (val: boolean) => void;
}

export interface DJFormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
}
