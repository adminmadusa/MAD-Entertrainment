'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, useEffect } from 'react';

import { Image as ImageIcon } from '@mad/ui/icons';

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
            <ImageIcon className="w-12 h-12 stroke-[1.5]" aria-hidden="true" />
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
