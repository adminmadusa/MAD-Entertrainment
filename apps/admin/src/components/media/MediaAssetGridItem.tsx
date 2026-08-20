'use client';

import type { CloudinaryAsset } from './useUnifiedMediaUpload';

interface MediaAssetGridItemProps {
  item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number };
  index: number;
  bannerImage: CloudinaryAsset | null;
  onMakeBanner: (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => void;
  onMakePoster: (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => void;
  onRemove: (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => void;
}

export function MediaAssetGridItem({
  item,
  index,
  bannerImage,
  onMakeBanner,
  onMakePoster,
  onRemove,
}: MediaAssetGridItemProps) {
  return (
    <div
      className={`group relative aspect-square rounded-2xl overflow-hidden border bg-background-dark/80 transition-all ${
        item.role === 'banner'
          ? 'border-accent-purple ring-2 ring-accent-purple/40 ring-offset-2 ring-offset-background-dark'
          : item.role === 'poster'
          ? 'border-accent-blue ring-2 ring-accent-blue/40 ring-offset-2 ring-offset-background-dark'
          : 'border-border-subtle hover:border-accent-purple/50'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.asset.url} alt={`Media ${index}`} className="w-full h-full object-cover" />

      {/* Role Badges */}
      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
        {item.role === 'banner' && (
          <span className="px-2 py-0.5 bg-accent-purple text-white text-[9px] font-black rounded-md shadow-lg uppercase tracking-wider">
            Banner
          </span>
        )}
        {item.role === 'poster' && (
          <span className="px-2 py-0.5 bg-accent-blue text-white text-[9px] font-black rounded-md shadow-lg uppercase tracking-wider">
            Poster
          </span>
        )}
        {item.role === 'gallery' && index === 0 && !bannerImage && (
          <span className="px-2 py-0.5 bg-accent-purple/40 text-white text-[9px] font-bold rounded-md shadow-lg border border-accent-purple/20 uppercase tracking-wider backdrop-blur-sm">
            Auto Banner
          </span>
        )}
      </div>

      {/* Hover Actions Panel */}
      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-3 z-10">
        {item.role !== 'banner' && (
          <button
            type="button"
            onClick={() => onMakeBanner(item)}
            className="w-full py-1 text-[10px] font-black bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors uppercase tracking-wider"
          >
            Make Banner
          </button>
        )}
        {item.role !== 'poster' && (
          <button
            type="button"
            onClick={() => onMakePoster(item)}
            className="w-full py-1 text-[10px] font-black bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors uppercase tracking-wider"
          >
            Make Poster
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="w-full py-1 text-[10px] font-black bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors uppercase tracking-wider mt-1"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
