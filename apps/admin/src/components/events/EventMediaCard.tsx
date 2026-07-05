import React from 'react';

import { EventGalleryUpload } from '@/components/EventGalleryUpload';
import { type CloudinaryImage } from '@/lib/api/admin/event.service';

export interface EventMediaCardProps {
  bannerImage: CloudinaryImage | null;
  setBannerImage: (img: CloudinaryImage | null) => void;
  posterImage: CloudinaryImage | null;
  setPosterImage: (img: CloudinaryImage | null) => void;
  galleryImages: CloudinaryImage[];
  setGalleryImages: (imgs: CloudinaryImage[]) => void;
}

export const EventMediaCard = React.memo(function EventMediaCard({
  bannerImage,
  setBannerImage,
  posterImage,
  setPosterImage,
  galleryImages,
  setGalleryImages,
}: EventMediaCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6">
      <h2 className="text-white font-semibold mb-4">Event Media (Banner, Poster, & Gallery)</h2>
      <EventGalleryUpload
        bannerImage={bannerImage}
        posterImage={posterImage}
        galleryImages={galleryImages}
        onChange={(b, p, g) => {
          setBannerImage(b);
          setPosterImage(p);
          setGalleryImages(g);
        }}
        maxTotalImages={15}
      />
    </div>
  );
});
