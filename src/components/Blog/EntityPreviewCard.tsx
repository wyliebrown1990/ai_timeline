import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePointerCoarse } from '../../hooks/usePointerCoarse';
import type { EntityType } from '../../hooks/useEntityPreview';
import { EntityPreviewBody } from './EntityPreviewBody';

interface Props {
  id: string;
  type: EntityType;
  slug: string;
  href: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const CARD_WIDTH_PX = 288; // w-72
const VIEWPORT_GUTTER = 16;
const MOBILE_BREAKPOINT = 480;

// Portal-rendered popover. Width is fixed at 288px (w-72) on desktop; mobile (touch primary
// OR < 480px viewport) uses a fixed bottom-sheet layout instead. Animation honors
// `prefers-reduced-motion`.
export function EntityPreviewCard({
  id,
  type,
  slug,
  href,
  anchorRect,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isCoarse = usePointerCoarse();

  const useBottomSheet =
    isCoarse || (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);

  // Initial position computed from the anchor rect; clamped + flipped after measurement.
  const initialLeft = useBottomSheet
    ? VIEWPORT_GUTTER
    : Math.max(
        VIEWPORT_GUTTER,
        Math.min(
          anchorRect.left + anchorRect.width / 2 - CARD_WIDTH_PX / 2,
          (typeof window !== 'undefined' ? window.innerWidth : CARD_WIDTH_PX + VIEWPORT_GUTTER * 2) -
            CARD_WIDTH_PX -
            VIEWPORT_GUTTER
        )
      );
  const initialTop = useBottomSheet ? undefined : anchorRect.bottom + 8;

  // After mount, measure and clamp/flip the popover so it never overflows the viewport.
  useLayoutEffect(() => {
    if (useBottomSheet) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw - VIEWPORT_GUTTER) {
      card.style.left = `${vw - rect.width - VIEWPORT_GUTTER}px`;
    }
    if (rect.left < VIEWPORT_GUTTER) {
      card.style.left = `${VIEWPORT_GUTTER}px`;
    }
    if (rect.bottom > vh - VIEWPORT_GUTTER) {
      // Flip above the trigger.
      card.style.top = `${anchorRect.top - rect.height - 8}px`;
    }
  }, [anchorRect, useBottomSheet]);

  // Escape closes; click outside the card AND outside any matching trigger anchor closes.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      // Don't close if the click landed on the trigger that opened us — that
      // anchor's own handlers manage the popover lifecycle. The describedby id
      // links anchor → popover; we look it up in the DOM.
      if (
        target instanceof Element &&
        target.closest(`[aria-describedby="${id}"]`)
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [id, onClose]);

  const desktopStyle: React.CSSProperties = {
    position: 'fixed',
    left: initialLeft,
    top: initialTop,
  };

  const bottomSheetStyle: React.CSSProperties = {
    position: 'fixed',
    left: VIEWPORT_GUTTER,
    right: VIEWPORT_GUTTER,
    bottom: VIEWPORT_GUTTER,
  };

  const animateClass = reducedMotion ? '' : 'animate-fade-in';

  // Desktop: w-72 fixed width; bottom-sheet leaves width to the inset rule.
  const sizingClass = useBottomSheet ? '' : 'w-72';

  const card = (
    <div
      ref={cardRef}
      id={id}
      data-testid="entity-preview-card"
      className={`fixed z-[100] ${sizingClass} bg-white dark:bg-gray-800 rounded-lg shadow-warm-md border border-gray-200 dark:border-gray-700 ${animateClass}`}
      style={useBottomSheet ? bottomSheetStyle : desktopStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {useBottomSheet ? (
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      ) : null}
      <EntityPreviewBody
        type={type}
        slug={slug}
        href={href}
        reserveTopRightSpace={useBottomSheet}
      />
    </div>
  );

  return createPortal(card, document.body);
}
