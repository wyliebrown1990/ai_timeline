import { useEffect, useState } from 'react';

// `(pointer: coarse)` is true on touch primary devices. Updates on dock/undock or
// external display swap via the `change` event on the MediaQueryList.
export function usePointerCoarse(): boolean {
  const [isCoarse, setIsCoarse] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handle = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    setIsCoarse(mq.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  return isCoarse;
}
