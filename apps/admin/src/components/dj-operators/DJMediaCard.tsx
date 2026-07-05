import React from 'react';

import { CloudinaryUpload } from '@/components/CloudinaryUpload';
import type { ImageAsset } from '@mad/types';

import { DJMediaCardProps } from './types';

export const DJMediaCard: React.FC<DJMediaCardProps> = ({
  profileImage,
  setProfileImage,
  galleryImages,
  setGalleryImages,
}) => {
  const handleImageChange = (index: number, asset: ImageAsset | null) => {
    if (asset === null) {
      setGalleryImages((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setGalleryImages((prev) => prev.map((img, idx) => (idx === index ? asset : img)));
    }
  };

  const handleAddImage = (asset: ImageAsset | null) => {
    if (asset) {
      setGalleryImages((prev) => [...prev, asset]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass rounded-2xl border border-border-subtle p-6 md:col-span-1 space-y-2">
        <label htmlFor="dj-profile-photo" className="text-sm font-medium text-text-secondary block">
          Profile Photo
        </label>
        <CloudinaryUpload
          folder="dj-operators"
          value={profileImage as any}
          onChange={setProfileImage as any}
          label=""
          aspectRatio="aspect-square"
          id="dj-profile-photo"
        />
      </div>
      <div className="glass rounded-2xl border border-border-subtle p-6 md:col-span-2 space-y-4">
        <h2 className="text-white font-semibold">DJ Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {galleryImages.map((img, index) => (
            <div key={img.publicId} className="relative">
              <label htmlFor={`dj-gallery-photo-${index}`} className="sr-only">
                Gallery Photo {index + 1}
              </label>
              <CloudinaryUpload
                folder="dj-operators"
                value={img as any}
                onChange={(asset) => handleImageChange(index, asset as any)}
                aspectRatio="aspect-video"
                label=""
                id={`dj-gallery-photo-${index}`}
              />
            </div>
          ))}
          {galleryImages.length < 10 && (
            <div>
              <label htmlFor="dj-gallery-photo-add" className="sr-only">
                Add Gallery Photo
              </label>
              <CloudinaryUpload
                folder="dj-operators"
                value={null}
                onChange={handleAddImage as any}
                aspectRatio="aspect-video"
                label=""
                id="dj-gallery-photo-add"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
