import { useEffect, useState } from 'react';

function shouldProbeImage(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith('/blog-uploads/');
  } catch {
    return false;
  }
}

export function useRenderableImageUrl(url: string | null | undefined): string | null {
  const [renderableUrl, setRenderableUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setRenderableUrl(null);
      return;
    }

    if (!shouldProbeImage(url)) {
      setRenderableUrl(url);
      return;
    }

    let cancelled = false;
    setRenderableUrl(null);

    const img = new Image();
    img.onload = () => {
      if (!cancelled) setRenderableUrl(url);
    };
    img.onerror = () => {
      if (!cancelled) setRenderableUrl(null);
    };
    img.src = url;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return renderableUrl;
}

export default useRenderableImageUrl;
