import React from 'react';

import { UnifiedMediaUpload } from '@/components/UnifiedMediaUpload';
import { type CloudinaryImage } from '@/lib/api/admin/event.service';

export interface EventMediaCardProps {
  bannerImage: CloudinaryImage | null;
  setBannerImage: (img: CloudinaryImage | null) => void;
  posterImage: CloudinaryImage | null;
  setPosterImage: (img: CloudinaryImage | null) => void;
  galleryImages?: CloudinaryImage[];
  setGalleryImages?: (imgs: CloudinaryImage[]) => void;
}

export const EventMediaCard = React.memo(function EventMediaCard({
  bannerImage,
  setBannerImage,
  posterImage,
  setPosterImage,
  galleryImages = [],
  setGalleryImages,
}: EventMediaCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6">
      <div>
        <h2 className="text-white font-semibold">Event Media</h2>
        <p className="text-text-muted text-xs mt-0.5">
          Upload cover banner, promotional poster, and up to 13 marketing photos (15 total)
        </p>
      </div>

      <UnifiedMediaUpload
        bannerImage={bannerImage}
        posterImage={posterImage}
        galleryImages={galleryImages}
        onChange={(b, p, g) => {
          setBannerImage(b);
          setPosterImage(p);
          setGalleryImages?.(g);
        }}
        maxTotalImages={15}
      />
    </div>
  );
});
