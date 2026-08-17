'use client';

import { useMutation } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';

import { adminAddGalleryItems, type GalleryItemPayload } from '@/lib/api/admin/event-gallery.service';
import { adminApiClient } from '@/lib/api/client';
import { MediaType } from '@mad/types';

export interface EventGalleryUploadZoneProps {
  eventId: string;
  onUploadComplete: () => void;
  disabled?: boolean;
}

export const EventGalleryUploadZone = React.memo(function EventGalleryUploadZone({
  eventId,
  onUploadComplete,
  disabled,
}: EventGalleryUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addItemsMutation = useMutation({
    mutationFn: (items: GalleryItemPayload[]) => adminAddGalleryItems(eventId, items),
    onSuccess: () => {
      setUploadingFiles([]);
      onUploadComplete();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to save items to gallery.');
      setUploadingFiles([]);
    }
  });

  const handleFiles = async (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return;
    setError(null);

    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (filesArray.length === 0) {
      setError('Please select valid image files.');
      return;
    }

    // Initialize progress state
    setUploadingFiles(filesArray.map(f => ({ name: f.name, progress: 0 })));

    try {
      const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);
      const uploadedAssets: GalleryItemPayload[] = [];

      // Upload one by one to avoid overwhelming, or could do Promise.all with chunking
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const formData = new FormData();
        formData.append('image', file);

        const { data: uploadRes } = await adminApiClient.post<{ data: { url: string; publicId: string } }>(
          `/admin/uploads/image?folder=events&sessionId=${sessionId}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                setUploadingFiles(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u));
              }
            },
          }
        );

        uploadedAssets.push({
          url: uploadRes.data.url,
          publicId: uploadRes.data.publicId,
          mediaType: MediaType.IMAGE,
        });
      }

      // Add to gallery via backend API
      if (uploadedAssets.length > 0) {
        addItemsMutation.mutate(uploadedAssets);
      }

    } catch (err: any) {
      setError(err.message || 'Upload to Cloudinary failed.');
      setUploadingFiles([]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled && uploadingFiles.length === 0 && !addItemsMutation.isPending) {
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-colors ${
          disabled
            ? 'border-border-subtle/50 bg-surface-elevated/40 opacity-40 cursor-not-allowed'
            : isDragging
            ? 'border-accent-purple bg-accent-purple/5'
            : 'border-border-subtle bg-surface-elevated hover:bg-surface-elevated/80 hover:border-text-muted cursor-pointer'
        } ${uploadingFiles.length > 0 || addItemsMutation.isPending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <div className="text-3xl sm:text-4xl mb-3">
          {disabled ? '🔒' : '📤'}
        </div>
        <h3 className="text-white font-medium text-sm sm:text-base mb-1">
          {disabled ? 'Gallery Uploads Locked' : 'Upload Gallery Images'}
        </h3>
        <p className="text-text-muted text-xs sm:text-sm mb-4">
          {disabled ? 'This event has not completed yet' : 'Drag & drop images here or click to browse'}
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/*"
          className="hidden"
          disabled={disabled}
        />

        {/* Upload Progress */}
        {(uploadingFiles.length > 0 || addItemsMutation.isPending) && (
          <div className="mt-6 max-w-sm mx-auto space-y-2 text-left">
            <div className="text-sm text-accent-purple font-medium text-center mb-2">
              {addItemsMutation.isPending ? 'Saving to Gallery...' : 'Uploading...'}
            </div>
            {uploadingFiles.map((file, idx) => (
              <div key={idx} className="bg-background-dark p-3 rounded-lg border border-border-subtle">
                <div className="flex justify-between text-xs text-text-muted mb-2">
                  <span className="truncate pr-4">{file.name}</span>
                  <span>{file.progress}%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent-purple h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
