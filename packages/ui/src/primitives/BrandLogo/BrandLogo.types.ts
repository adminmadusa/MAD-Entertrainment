import type { HTMLAttributes } from 'react';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BrandLogoVariant = 'emblem' | 'with-text';

export interface BrandLogoProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  text?: string;
  subtext?: string;
  imageSrc?: string;
  altText?: string;
}
