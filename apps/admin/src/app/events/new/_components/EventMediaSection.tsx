'use client';

import React from 'react';
import { EventMediaCard } from '@/components/events/EventMediaCard';
import type { CloudinaryImage } from './types';

interface EventMediaSectionProps {
  coverImage: CloudinaryImage | null;
  setCoverImage: (img: CloudinaryImage | null) => void;
  posterImage: CloudinaryImage | null;
  setPosterImage: (img: CloudinaryImage | null) => void;
  galleryImages: CloudinaryImage[];
  setGalleryImages: (imgs: CloudinaryImage[]) => void;
}

export function EventMediaSection({
  coverImage,
  setCoverImage,
  posterImage,
  setPosterImage,
  galleryImages,
  setGalleryImages,
}: EventMediaSectionProps) {
  return (
    <EventMediaCard
      bannerImage={coverImage}
      setBannerImage={setCoverImage}
      posterImage={posterImage}
      setPosterImage={setPosterImage}
      galleryImages={galleryImages}
      setGalleryImages={setGalleryImages}
    />
  );
}
