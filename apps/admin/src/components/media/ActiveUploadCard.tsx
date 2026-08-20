'use client';

import type { UploadProgress } from './useUnifiedMediaUpload';

interface ActiveUploadCardProps {
  upload: UploadProgress;
  onClear: (id: string) => void;
}

export function ActiveUploadCard({ upload, onClear }: ActiveUploadCardProps) {
  return (
    <div
      className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-3 text-center ${
        upload.state === 'error'
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border-subtle bg-white/2'
      }`}
    >
      <button
        type="button"
        onClick={() => onClear(upload.id)}
        className="absolute top-2 right-2 text-text-muted hover:text-white p-1 text-xs"
        aria-label="Remove upload card"
      >
        ✕
      </button>

      {upload.state === 'uploading' ? (
        <div className="space-y-3 w-full px-2">
          <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-accent-purple/20 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" />
            <span className="text-[10px] font-bold text-accent-purple">{upload.progress}%</span>
          </div>
          <div className="text-[10px] text-text-muted truncate w-full" title={upload.name}>
            {upload.name}
          </div>
        </div>
      ) : upload.state === 'success' ? (
        <div className="space-y-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            ✓
          </div>
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            Completed
          </div>
        </div>
      ) : (
        <div className="space-y-1 w-full px-1">
          <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 font-bold">
            !
          </div>
          <div className="text-[9px] text-red-400 font-medium leading-tight line-clamp-2">
            {upload.error || 'Failed'}
          </div>
        </div>
      )}
    </div>
  );
}
