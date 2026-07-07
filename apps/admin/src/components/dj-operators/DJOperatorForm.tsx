import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import type { DJOperator, ImageAsset } from '@mad/types';
import { Alert, AdminFormActions } from '@mad/ui';

import { DJBasicInfoCard } from './DJBasicInfoCard';
import { DJMediaCard } from './DJMediaCard';
import { DJSocialLinksCard } from './DJSocialLinksCard';

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
  const [error, setError] = useState('');

  // Centralized State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Social Links
  const [instagram, setInstagram] = useState('');
  const [soundcloud, setSoundcloud] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [spotify, setSpotify] = useState('');
  const [website, setWebsite] = useState('');

  // Media
  const [profileImage, setProfileImage] = useState<ImageAsset | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageAsset[]>([]);

  // Synchronize API errors
  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  // Prepopulate state when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setBio(initialData.bio || '');
      setSpecialties(initialData.specialties?.join(', ') || '');
      setExperienceYears(initialData.experienceYears !== undefined ? String(initialData.experienceYears) : '');
      setIsActive(initialData.isActive ?? true);

      const getSocialUrl = (platform: string) => {
        const socialLinks = initialData.socialLinks as { platform: string; url: string }[] | undefined;
        return socialLinks?.find((link) => link.platform === platform)?.url || '';
      };
      setInstagram(getSocialUrl('instagram'));
      setSoundcloud(getSocialUrl('soundcloud'));
      setYoutube(getSocialUrl('youtube'));
      setFacebook(getSocialUrl('facebook'));
      setTwitter(getSocialUrl('twitter'));
      setSpotify(getSocialUrl('spotify'));
      setWebsite(getSocialUrl('website'));

      setProfileImage(initialData.profileImage || null);
      setGalleryImages(initialData.galleryImages || []);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    const cleanSlug = slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const specs = specialties.split(',').map((s) => s.trim()).filter(Boolean);
    const links = [
      ...(instagram.trim() ? [{ platform: 'instagram', url: instagram.trim() }] : []),
      ...(soundcloud.trim() ? [{ platform: 'soundcloud', url: soundcloud.trim() }] : []),
      ...(youtube.trim() ? [{ platform: 'youtube', url: youtube.trim() }] : []),
      ...(facebook.trim() ? [{ platform: 'facebook', url: facebook.trim() }] : []),
      ...(twitter.trim() ? [{ platform: 'twitter', url: twitter.trim() }] : []),
      ...(spotify.trim() ? [{ platform: 'spotify', url: spotify.trim() }] : []),
      ...(website.trim() ? [{ platform: 'website', url: website.trim() }] : []),
    ];

    const parsedExpYears = parseInt(experienceYears, 10);

    const payload: Partial<DJOperator> = {
      name: name.trim(),
      slug: cleanSlug,
      bio: bio.trim() || undefined,
      specialties: specs.length > 0 ? specs : undefined,
      experienceYears: isNaN(parsedExpYears) || parsedExpYears < 0 ? 0 : parsedExpYears,
      profileImage: isEdit
        ? ((profileImage === null ? null : profileImage) as unknown as DJOperator['profileImage'])
        : (profileImage ?? undefined),
      galleryImages: galleryImages ?? [],
      socialLinks: links.length > 0 ? links : undefined,
      isActive,
    };

    onSubmit(payload);
  };

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
          profileImage={profileImage}
          setProfileImage={setProfileImage}
          galleryImages={galleryImages}
          setGalleryImages={setGalleryImages}
        />

        <DJBasicInfoCard
          name={name}
          setName={setName}
          slug={slug}
          setSlug={setSlug}
          specialties={specialties}
          setSpecialties={setSpecialties}
          bio={bio}
          setBio={setBio}
          experienceYears={experienceYears}
          setExperienceYears={setExperienceYears}
          isEdit={isEdit}
        />

        <DJSocialLinksCard
          instagram={instagram}
          setInstagram={setInstagram}
          soundcloud={soundcloud}
          setSoundcloud={setSoundcloud}
          youtube={youtube}
          setYoutube={setYoutube}
          facebook={facebook}
          setFacebook={setFacebook}
          twitter={twitter}
          setTwitter={setTwitter}
          spotify={spotify}
          setSpotify={setSpotify}
          website={website}
          setWebsite={setWebsite}
          isActive={isActive}
          setIsActive={setIsActive}
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
