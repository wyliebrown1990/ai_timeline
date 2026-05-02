import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Drawer({ open, onClose, title, description, children }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = panelRef.current
        ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const activeElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !panelRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => {
      const focusableElements = panelRef.current
        ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];
      (focusableElements[0] ?? panelRef.current ?? closeButtonRef.current)?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close drawer"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="absolute inset-y-0 right-0 flex w-full justify-end">
        <section
          ref={panelRef}
          tabIndex={-1}
          className="flex h-full w-full max-w-none flex-col bg-white shadow-2xl transition-transform duration-300 motion-reduce:transition-none dark:bg-gray-900 sm:w-[480px]"
        >
          <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </section>
      </div>
    </div>,
    document.body
  );
}

export default Drawer;
