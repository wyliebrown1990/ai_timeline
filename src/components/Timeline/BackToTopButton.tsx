import { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface BackToTopButtonProps {
  /** Scroll threshold before showing button (in pixels) */
  threshold?: number;
  /** Whether to show on mobile only */
  mobileOnly?: boolean;
}

/**
 * BackToTopButton - Floating action button to scroll back to top
 * Sprint TD-5: Mobile Timeline Optimization
 */
export function BackToTopButton({
  threshold = 400,
  mobileOnly = true,
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-40
        flex h-12 w-12 items-center justify-center
        rounded-full bg-orange-500 text-white shadow-lg
        transition-all duration-200
        hover:bg-orange-600 hover:scale-110
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
        ${mobileOnly ? 'lg:hidden' : ''}
      `}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default BackToTopButton;
