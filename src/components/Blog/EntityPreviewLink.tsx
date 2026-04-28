import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AnchorHTMLAttributes, ReactNode, TouchEvent as ReactTouchEvent } from 'react';
import { usePointerCoarse } from '../../hooks/usePointerCoarse';
import { clearActivePreview, setActivePreview } from './entityPreviewController';
import { EntityPreviewCard } from './EntityPreviewCard';
import { parseEntityHref } from './parseEntityHref';
import type { EntityType } from '../../hooks/useEntityPreview';

const HOVER_OPEN_DELAY_MS = 150;
const HOVER_CLOSE_DELAY_MS = 100;
const LONG_PRESS_MS = 350;

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

// Wraps an entity link with hover (desktop), focus (keyboard), and long-press (touch)
// behaviors that open an EntityPreviewCard popover. Click/short-tap navigation is preserved
// — we never replace the underlying <a>.
export function EntityPreviewLink({ href, children, ...rest }: Props) {
  const parsed = parseEntityHref(href);
  if (!parsed) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <EntityPreviewLinkInner href={href} parsed={parsed} {...rest}>
      {children}
    </EntityPreviewLinkInner>
  );
}

interface InnerProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  parsed: { type: EntityType; slug: string };
}

function EntityPreviewLinkInner({ href, parsed, children, ...rest }: InnerProps) {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const isCoarse = usePointerCoarse();
  const reactId = useId();
  const popoverId = `entity-preview-${parsed.type}-${parsed.slug}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const open = useCallback(() => {
    if (!triggerRef.current) return;
    setAnchorRect(triggerRef.current.getBoundingClientRect());
    setIsOpen(true);
    setActivePreview(popoverId, () => setIsOpen(false));
  }, [popoverId]);

  const close = useCallback(() => {
    setIsOpen(false);
    clearActivePreview(popoverId);
  }, [popoverId]);

  // Reduce/reset on unmount: cancel any pending timers and unregister singleton state.
  useEffect(() => {
    return () => {
      clearTimers();
      clearActivePreview(popoverId);
    };
  }, [popoverId]);

  const handleMouseEnter = () => {
    if (isCoarse) return;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        open();
      }, HOVER_OPEN_DELAY_MS);
    }
  };

  const handleMouseLeave = () => {
    if (isCoarse) return;
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current === null) {
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        close();
      }, HOVER_CLOSE_DELAY_MS);
    }
  };

  const handleFocus = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    open();
  };

  const handleBlur = () => {
    if (closeTimerRef.current === null) {
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        close();
      }, HOVER_CLOSE_DELAY_MS);
    }
  };

  const handleTouchStart = (_e: ReactTouchEvent<HTMLAnchorElement>) => {
    longPressFiredRef.current = false;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressFiredRef.current = true;
      open();
    }, LONG_PRESS_MS);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // If long-press already fired, swallow the click that would otherwise navigate.
  // Short-tap still fires click → navigate.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (longPressFiredRef.current) {
      e.preventDefault();
      longPressFiredRef.current = false;
    }
    if (rest.onClick) rest.onClick(e);
  };

  // On Escape close, return focus to the trigger anchor (UX-M6).
  const handleClose = useCallback(() => {
    close();
    // Defer to next tick so Card's portal has fully unmounted.
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, [close]);

  return (
    <>
      <a
        {...rest}
        ref={triggerRef}
        href={href}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
        aria-describedby={isOpen ? popoverId : undefined}
        style={{ WebkitTouchCallout: 'none', userSelect: 'none', ...(rest.style || {}) }}
        data-entity-type={parsed.type}
        data-entity-slug={parsed.slug}
      >
        {children}
      </a>
      {isOpen && anchorRect ? (
        <EntityPreviewCard
          id={popoverId}
          type={parsed.type}
          slug={parsed.slug}
          href={href}
          anchorRect={anchorRect}
          onClose={handleClose}
          onMouseEnter={() => {
            if (closeTimerRef.current !== null) {
              window.clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        />
      ) : null}
    </>
  );
}
