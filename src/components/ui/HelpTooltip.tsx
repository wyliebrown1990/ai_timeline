import { CircleHelp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';

interface HelpTooltipProps {
  description: string;
  title?: string;
  buttonLabel?: string;
  className?: string;
}

type TooltipPlacement = 'top' | 'bottom';

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 12;
const VIEWPORT_PADDING = 16;

export function HelpTooltip({
  description,
  title,
  buttonLabel,
  className = '',
}: HelpTooltipProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const estimatedHeight = title ? 120 : 96;
      const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING);
      const left = Math.min(
        maxLeft,
        Math.max(VIEWPORT_PADDING, rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2))
      );
      const shouldPlaceBelow = rect.top < estimatedHeight + VIEWPORT_PADDING;

      setPosition({
        left,
        top: shouldPlaceBelow
          ? rect.bottom + TOOLTIP_GAP
          : rect.top - estimatedHeight - TOOLTIP_GAP,
        placement: shouldPlaceBelow ? 'bottom' : 'top',
      });
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open, title]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={buttonLabel ?? title ?? description}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-sky-700 dark:hover:text-sky-300 ${className}`.trim()}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open && position ? createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          aria-live="polite"
          className="pointer-events-none fixed z-[110] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-left text-sm text-white shadow-2xl dark:border-slate-700"
          style={{
            left: position.left,
            top: position.top,
          }}
        >
          {title ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{title}</p>
          ) : null}
          <p className={title ? 'mt-2 leading-6 text-slate-100' : 'leading-6 text-slate-100'}>{description}</p>
          <div
            aria-hidden="true"
            className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-slate-200 bg-slate-950 dark:border-slate-700 ${
              position.placement === 'top'
                ? 'bottom-[-7px] border-b border-r'
                : 'top-[-7px] border-l border-t'
            }`}
          />
        </div>,
        document.body
      ) : null}
    </>
  );
}

export default HelpTooltip;
