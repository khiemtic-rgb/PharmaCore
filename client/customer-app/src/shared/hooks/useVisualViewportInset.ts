import { useEffect } from 'react';

/** Keep fixed chat composer aligned to the visible viewport (iOS keyboard / zoom). */
export function useVisualViewportInset(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
      // iOS pans the layout viewport when focusing inputs — lock composer to visible width.
      document.documentElement.style.setProperty('--vv-offset-left', `${viewport.offsetLeft}px`);
      document.documentElement.style.setProperty('--vv-width', `${viewport.width}px`);
    };

    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
      document.documentElement.style.removeProperty('--keyboard-inset');
      document.documentElement.style.removeProperty('--vv-offset-left');
      document.documentElement.style.removeProperty('--vv-width');
    };
  }, [enabled]);
}
