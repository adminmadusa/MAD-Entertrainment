export const brandLogoSizes: Record<
  string,
  { image: string; text: string; subtext: string }
> = {
  xs: { image: 'w-6 h-6', text: 'text-xs', subtext: 'text-[9px]' },
  sm: { image: 'w-8 h-8', text: 'text-sm', subtext: 'text-[10px]' },
  md: { image: 'w-10 h-10', text: 'text-base', subtext: 'text-xs' },
  lg: { image: 'w-12 h-12', text: 'text-lg', subtext: 'text-xs' },
  xl: { image: 'w-16 h-16', text: 'text-xl', subtext: 'text-sm' },
};
