import { useRouter } from 'next/navigation';
import React from 'react';

import type { DJOperator } from '@mad/types';
import { Alert, AdminFormActions } from '@mad/ui';

import { DJBasicInfoCard } from './DJBasicInfoCard';
import { DJMediaCard } from './DJMediaCard';
import { DJSocialLinksCard } from './DJSocialLinksCard';
import { useDJOperatorForm } from './useDJOperatorForm';

interface DJOperatorFormProps {
  title: string;
  subtitle: string;
  initialData?: DJOperator | null;
  onSubmit: (payload: Partial<DJOperator>) => void;
  isPending: boolean;
  error?: string | null;
  submitLabel: string;
  pendingLabel: string;
  isEdit?: boolean;
}

export const DJOperatorForm: React.FC<DJOperatorFormProps> = ({
  title,
  subtitle,
  initialData,
  onSubmit,
  isPending,
  error: apiError,
  submitLabel,
  pendingLabel,
  isEdit = false,
}) => {
  const router = useRouter();
  const { error, handleSubmit, basicInfo, socialLinks, media } = useDJOperatorForm({
    initialData,
    apiError,
    isEdit,
    onSubmit,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="text-text-muted text-sm mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="danger" className="animate-in fade-in duration-300">
            {error}
          </Alert>
        )}

        <DJMediaCard
          profileImage={media.profileImage}
          setProfileImage={media.setProfileImage}
          galleryImages={media.galleryImages}
          setGalleryImages={media.setGalleryImages}
        />

        <DJBasicInfoCard
          name={basicInfo.name}
          setName={basicInfo.setName}
          slug={basicInfo.slug}
          setSlug={basicInfo.setSlug}
          specialties={basicInfo.specialties}
          setSpecialties={basicInfo.setSpecialties}
          bio={basicInfo.bio}
          setBio={basicInfo.setBio}
          experienceYears={basicInfo.experienceYears}
          setExperienceYears={basicInfo.setExperienceYears}
          isEdit={basicInfo.isEdit}
        />

        <DJSocialLinksCard
          instagram={socialLinks.instagram}
          setInstagram={socialLinks.setInstagram}
          soundcloud={socialLinks.soundcloud}
          setSoundcloud={socialLinks.setSoundcloud}
          youtube={socialLinks.youtube}
          setYoutube={socialLinks.setYoutube}
          facebook={socialLinks.facebook}
          setFacebook={socialLinks.setFacebook}
          twitter={socialLinks.twitter}
          setTwitter={socialLinks.setTwitter}
          spotify={socialLinks.spotify}
          setSpotify={socialLinks.setSpotify}
          website={socialLinks.website}
          setWebsite={socialLinks.setWebsite}
          isActive={socialLinks.isActive}
          setIsActive={socialLinks.setIsActive}
        />

        <AdminFormActions
          onCancel={() => router.back()}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          isPending={isPending}
          submitId="dj-submit"
        />
      </form>
    </div>
  );
};
