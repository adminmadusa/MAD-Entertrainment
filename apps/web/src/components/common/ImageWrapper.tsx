'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, useEffect } from 'react';

interface ImageWrapperProps extends Omit<ImageProps, 'onError'> {
  fallbackIcon?: React.ReactNode;
}

export function ImageWrapper({ src, alt, className = '', fallbackIcon, ...props }: ImageWrapperProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-white/5 border border-white/5 relative overflow-hidden ${className}`}>
        {/* Subtle premium background gradient grid */}
        <div className="absolute inset-0 bg-gradient-to-tr from-accent-purple/10 to-accent-pink/10 opacity-30 pointer-events-none" />
        <div className="text-white/20 select-none pointer-events-none z-10 scale-125">
          {fallbackIcon || (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
            </svg>
          )}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
