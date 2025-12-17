/**
 * useMediaQuery hook - detects if a media query matches
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Initialize with the correct value if window is available
  const getMatches = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

// Convenience hook for mobile detection (below lg breakpoint)
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 1024px)');
}
