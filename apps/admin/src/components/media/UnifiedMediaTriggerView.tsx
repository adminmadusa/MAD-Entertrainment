'use client';

import { useRef, useState } from 'react';
import type { UploadProgress } from './useUnifiedMediaUpload';

interface UnifiedMediaTriggerViewProps {
  disabled: boolean;
  warningMessage: string;
  uploads: UploadProgress[];
  onUploadFile: (file: File) => void;
}

export function UnifiedMediaTriggerView({
  disabled,
  warningMessage,
  uploads,
  onUploadFile,
}: UnifiedMediaTriggerViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {warningMessage && (
        <div
          aria-live="polite"
          className="px-4 py-2 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400"
        >
          {warningMessage}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) {
            const files = e.dataTransfer.files;
            if (files) {
              for (let i = 0; i < files.length; i++) {
                onUploadFile(files[i]);
              }
            }
          }
        }}
        onClick={() => {
          if (!disabled && uploads.length === 0) {
            inputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-colors ${
          disabled
            ? 'border-border-subtle/50 bg-surface-elevated/40 opacity-40 cursor-not-allowed'
            : isDragging
            ? 'border-accent-purple bg-accent-purple/5'
            : 'border-border-subtle bg-surface-elevated hover:bg-surface-elevated/80 hover:border-text-muted cursor-pointer'
        } ${uploads.length > 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <div className="text-3xl sm:text-4xl mb-3">{disabled ? '🔒' : '📤'}</div>
        <h3 className="text-white font-medium text-sm sm:text-base mb-1">
          {disabled ? 'Gallery Uploads Locked' : 'Upload Gallery Images'}
        </h3>
        <p className="text-text-muted text-xs sm:text-sm mb-4">
          {disabled
            ? 'This event has not completed yet'
            : 'Drag & drop images here or click to browse'}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const files = e.target.files;
            if (files) {
              for (let i = 0; i < files.length; i++) {
                onUploadFile(files[i]);
              }
            }
            e.target.value = '';
          }}
        />

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="mt-6 max-w-sm mx-auto space-y-2 text-left">
            {uploads.map((up) => (
              <div
                key={up.id}
                className="bg-background-dark p-3 rounded-lg border border-border-subtle"
              >
                <div className="flex justify-between text-xs text-text-muted mb-2">
                  <span className="truncate pr-4">{up.name}</span>
                  <span>{up.progress}%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      up.state === 'error' ? 'bg-red-500' : 'bg-accent-purple'
                    }`}
                    style={{ width: `${up.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
