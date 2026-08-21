import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { brandLogoSizes } from './BrandLogo.styles';
import type { BrandLogoProps } from './BrandLogo.types';

export const BrandLogo = forwardRef<HTMLDivElement, BrandLogoProps>(
  (
    {
      className,
      variant = 'with-text',
      size = 'sm',
      text = 'MAD',
      subtext = 'Entertrainment',
      imageSrc = '/brand/logo-64.png',
      altText = 'MAD Entertrainment Logo',
      ...props
    },
    ref
  ) => {
    const config = brandLogoSizes[size] || brandLogoSizes.sm;

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2.5 select-none', className)}
        {...props}
      >
        <div
          className={cn(
            'relative shrink-0 rounded-xl overflow-hidden shadow-glow-sm bg-black border border-white/10 flex items-center justify-center',
            config.image
          )}
        >
          <img
            src={imageSrc}
            alt={altText}
            className="w-full h-full object-contain"
            loading="eager"
            decoding="async"
          />
        </div>

        {variant === 'with-text' && (
          <div className="flex flex-col leading-none">
            <span className={cn('font-black text-white tracking-tight', config.text)}>
              {text}{' '}
              {subtext && <span className="text-gradient font-bold">{subtext}</span>}
            </span>
          </div>
        )}
      </div>
    );
  }
);

BrandLogo.displayName = 'BrandLogo';
