import { useState, useEffect, useRef } from 'react';

export interface ViewportState {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

export function useCheckoutViewportController(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>({
    width: 1024,
    height: 768,
    offsetTop: 0,
    offsetLeft: 0,
    isKeyboardOpen: false,
    keyboardHeight: 0,
  });

  const lastWidthRef = useRef<number>(0);
  const baselineHeightRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    
    // Set initial baseline height (assumed keyboard-closed height)
    baselineHeightRef.current = window.innerHeight;
    lastWidthRef.current = vv.width;

    const handleResize = () => {
      const currentHeight = vv.height;
      const currentLayoutHeight = window.innerHeight;
      const currentWidth = vv.width;

      // If width changed (e.g. orientation change or desktop resizing), reset baseline
      if (currentWidth !== lastWidthRef.current) {
        lastWidthRef.current = currentWidth;
        baselineHeightRef.current = currentLayoutHeight;
      } else {
        // Otherwise, baseline layout height is the maximum height observed at this width
        baselineHeightRef.current = Math.max(baselineHeightRef.current, currentLayoutHeight);
      }

      // Detect virtual keyboard opening: visual viewport height shrinks significantly
      const heightDelta = baselineHeightRef.current - currentHeight;
      const isKeyboardOpen = vv.scale === 1 && heightDelta > 120; // 120px threshold covers virtual keyboard

      setViewport({
        width: vv.width,
        height: currentHeight,
        offsetTop: vv.offsetTop,
        offsetLeft: vv.offsetLeft,
        isKeyboardOpen,
        keyboardHeight: isKeyboardOpen ? heightDelta : 0,
      });

      // Synchronize visual viewport variables to document root for styles
      document.documentElement.style.setProperty('--visual-viewport-height', `${currentHeight}px`);
      document.documentElement.style.setProperty('--visual-viewport-offset-top', `${vv.offsetTop}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${isKeyboardOpen ? heightDelta : 0}px`);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    
    // Initial invocation
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
      
      // Clean up the CSS properties from documentElement on unmount
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.style.removeProperty('--visual-viewport-offset-top');
      document.documentElement.style.removeProperty('--keyboard-height');
    };
  }, []);

  return viewport;
}
