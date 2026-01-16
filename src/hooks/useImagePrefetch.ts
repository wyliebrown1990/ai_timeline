/**
 * useImagePrefetch Hook (Sprint Feed-6)
 *
 * Prefetches images for upcoming feed items to improve perceived performance.
 * Uses requestIdleCallback for non-blocking prefetch.
 */

import { useEffect, useRef } from 'react';
import type { FeedItem } from '../types/feed';

const PREFETCH_COUNT = 3; // Number of items to prefetch ahead

/**
 * Prefetch a single image
 */
function prefetchImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to prefetch: ${url}`));
    img.src = url;
  });
}

/**
 * Hook to prefetch images for upcoming feed items
 */
export function useImagePrefetch(
  items: FeedItem[],
  currentIndex: number
): void {
  const prefetchedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get the next N items that need prefetching
    const itemsToPrefetch = items.slice(
      currentIndex + 1,
      currentIndex + 1 + PREFETCH_COUNT
    );

    const prefetchNext = () => {
      itemsToPrefetch.forEach((item) => {
        if (item.thumbnailUrl && !prefetchedUrls.current.has(item.thumbnailUrl)) {
          prefetchedUrls.current.add(item.thumbnailUrl);

          // Use requestIdleCallback for non-blocking prefetch
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(
              () => {
                prefetchImage(item.thumbnailUrl!).catch(() => {
                  // Silently fail - prefetch is best-effort
                  prefetchedUrls.current.delete(item.thumbnailUrl!);
                });
              },
              { timeout: 2000 }
            );
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              prefetchImage(item.thumbnailUrl!).catch(() => {
                prefetchedUrls.current.delete(item.thumbnailUrl!);
              });
            }, 100);
          }
        }
      });
    };

    prefetchNext();
  }, [items, currentIndex]);

  // Clean up old prefetch entries when items change significantly
  useEffect(() => {
    // Only keep URLs that are still in current items range
    const validUrls = new Set(
      items
        .slice(Math.max(0, currentIndex - 5), currentIndex + PREFETCH_COUNT + 5)
        .map((item) => item.thumbnailUrl)
        .filter(Boolean) as string[]
    );

    // Remove entries not in valid range to prevent memory growth
    const toRemove: string[] = [];
    prefetchedUrls.current.forEach((url) => {
      if (!validUrls.has(url)) {
        toRemove.push(url);
      }
    });
    toRemove.forEach((url) => prefetchedUrls.current.delete(url));
  }, [items, currentIndex]);
}

export default useImagePrefetch;
