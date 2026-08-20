export const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full w-full h-full rounded-none',
};

// Base Styles
// Use transition-[transform,opacity] instead of transition-all to avoid
// triggering unnecessary style recalculations on layout properties.
export const modalBackdropBaseClasses = 'fixed inset-0 z-50 flex bg-black/80 backdrop-blur-[2px] transition-opacity duration-fast ease-smooth';
export const modalContentBaseClasses = 'bg-surface-secondary relative w-full shadow-2xl focus:outline-none cursor-default transition-[transform,opacity] duration-base ease-smooth';

// Presentation Styles
export const modalBackdropPresentations = {
  'centered': 'items-center justify-center p-4',
  'bottom-sheet': 'items-end sm:items-center justify-center p-0 sm:p-4',
};

export const modalContentPresentations = {
  'centered': 'border border-border rounded-2xl p-6',
  'bottom-sheet': 'border-t sm:border border-border rounded-t-2xl sm:rounded-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 max-h-[calc(100dvh-env(safe-area-inset-top))] sm:max-h-none overflow-y-auto sm:overflow-visible',
};

// Initial/exit state — applied when isVisible = false
export const modalContentInitialStates = {
  'centered': 'opacity-0 scale-95',
  'bottom-sheet': 'translate-y-full sm:translate-y-0 sm:opacity-0 sm:scale-95',
};

// Active state — applied when isVisible = true
export const modalContentActiveStates = {
  'centered': 'opacity-100 scale-100',
  'bottom-sheet': 'translate-y-0 opacity-100 scale-100',
};

export const modalCloseButtonClasses = 'absolute right-4 top-4 text-text-primary w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-surface-card hover:border hover:border-border transition-all duration-fast z-10';
export const modalCloseIconClasses = 'h-5 w-5';
export const modalDragHandleClasses = 'w-12 h-1.5 bg-white/20 hover:bg-white/30 rounded-full mx-auto mb-4 sm:hidden cursor-grab active:cursor-grabbing transition-colors';

