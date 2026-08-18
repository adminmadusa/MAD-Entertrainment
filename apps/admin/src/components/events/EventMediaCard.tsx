import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

import { UnifiedMediaUpload } from '@/components/UnifiedMediaUpload';
import { type CloudinaryImage } from '@/lib/api/admin/event.service';

export interface EventMediaCardProps {
  bannerImage: CloudinaryImage | null;
  setBannerImage: (img: CloudinaryImage | null) => void;
  posterImage: CloudinaryImage | null;
  setPosterImage: (img: CloudinaryImage | null) => void;
}

export const EventMediaCard = React.memo(function EventMediaCard({
  bannerImage,
  setBannerImage,
  posterImage,
  setPosterImage,
}: EventMediaCardProps) {
  const { id } = useParams() as { id: string };

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Event Media</h2>
          <p className="text-text-muted text-xs mt-0.5">Upload cover banner and promotional poster</p>
        </div>
        {id && (
          <Link
            href={`/events/${id}/gallery`}
            className="px-4 py-2 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 transition-colors rounded-lg text-sm font-medium"
          >
            Manage Event Gallery →
          </Link>
        )}
      </div>

      <UnifiedMediaUpload
        bannerImage={bannerImage}
        posterImage={posterImage}
        galleryImages={[]}
        onChange={(b, p) => {
          setBannerImage(b);
          setPosterImage(p);
        }}
        maxTotalImages={2}
      />
    </div>
  );
});
