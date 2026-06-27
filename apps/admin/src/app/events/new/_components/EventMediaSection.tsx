'use client';

import React from 'react';
import { EventGalleryUpload } from '@/components/EventGalleryUpload';
import { CloudinaryImage } from './types';

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
    <div className="glass rounded-2xl border border-border-subtle p-6">
      <h2 className="text-white font-semibold mb-4">Event Media (Banner, Poster, & Gallery)</h2>
      <EventGalleryUpload
        bannerImage={coverImage}
        posterImage={posterImage}
        galleryImages={galleryImages}
        onChange={(b, p, g) => {
          setCoverImage(b);
          setPosterImage(p);
          setGalleryImages(g);
        }}
        maxTotalImages={15}
      />
    </div>
  );
}
