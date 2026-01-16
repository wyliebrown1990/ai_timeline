/**
 * FeedPage Component (Sprint Feed-2)
 *
 * Main page for the AI News Shorts TikTok-style feed.
 * This is a full-screen experience outside the main layout.
 */

import { useEffect } from 'react';
import { FeedContainer } from '../components/Feed/FeedContainer';
import { useFeed } from '../hooks/useFeed';

export function FeedPage() {
  const {
    items,
    isLoading,
    hasMore,
    error,
    currentIndex,
    goToIndex,
    loadMore,
    refresh,
  } = useFeed({ initialLimit: 10, autoFetch: true });

  // Set document title
  useEffect(() => {
    document.title = 'AI News Shorts | AI Timeline';
    return () => {
      document.title = 'AI Timeline';
    };
  }, []);

  return (
    <FeedContainer
      items={items}
      currentIndex={currentIndex}
      isLoading={isLoading}
      hasMore={hasMore}
      error={error}
      onIndexChange={goToIndex}
      onLoadMore={loadMore}
      onRefresh={refresh}
    />
  );
}

export default FeedPage;
