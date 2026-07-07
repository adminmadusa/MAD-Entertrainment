export const drawerBackdropClasses = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] transition-opacity duration-base';
export const drawerContentBaseClasses = 'fixed bg-surface-secondary border-border shadow-2xl focus:outline-none flex flex-col transition-transform duration-base';

export const drawerSides = {
  bottom: 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl border-t w-full',
  left: 'left-0 top-0 bottom-0 w-full max-w-xs sm:max-w-sm rounded-r-2xl border-r h-full',
  right: 'right-0 top-0 bottom-0 w-full max-w-xs sm:max-w-sm rounded-l-2xl border-l h-full',
  top: 'top-0 left-0 right-0 max-h-[90vh] rounded-b-2xl border-b w-full',
};

export const drawerHeaderClasses = 'flex items-center justify-between p-4 border-b border-border';
export const drawerTitleClasses = 'text-sm font-semibold text-text-primary';
export const drawerBodyClasses = 'flex-1 overflow-y-auto p-4';
export const drawerCloseClasses = 'text-text-primary hover:bg-surface-card hover:border hover:border-border';
