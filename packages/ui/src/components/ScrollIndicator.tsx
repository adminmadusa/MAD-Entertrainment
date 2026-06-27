import React from 'react';

export function ScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none select-none">
      <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold animate-pulse">Scroll</span>
      <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center p-1 bg-black/10 backdrop-blur-[2px]">
        <div className="w-1 h-1.5 bg-accent-purple rounded-full animate-scroll-dot" />
      </div>
    </div>
  );
}
