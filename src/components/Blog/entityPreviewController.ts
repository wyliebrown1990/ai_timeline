// Singleton popover controller — only one EntityPreviewCard may be open at a time.
// Mouse-zipping across multiple entity links opens N → close N-1 immediately.

type CloseFn = () => void;

let activeId: string | null = null;
let activeClose: CloseFn | null = null;

export function setActivePreview(id: string, close: CloseFn): void {
  if (activeId && activeId !== id && activeClose) {
    activeClose();
  }
  activeId = id;
  activeClose = close;
}

export function clearActivePreview(id: string): void {
  if (activeId === id) {
    activeId = null;
    activeClose = null;
  }
}

export function getActivePreviewId(): string | null {
  return activeId;
}
