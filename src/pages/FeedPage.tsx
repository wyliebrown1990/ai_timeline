/**
 * FeedPage Component (Sprint Feed-2)
 *
 * Main page for the AI News Shorts TikTok-style feed.
 * This is a full-screen experience outside the main layout.
 */

import { FeedContainer } from '../components/Feed/FeedContainer';
import { useFeed } from '../hooks/useFeed';
import { SEO } from '../components/SEO';

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

  return (
    <>
      <SEO
        title="AI News Shorts"
        description="Watch bite-sized AI news updates in a TikTok-style feed. Stay current on the latest developments in artificial intelligence."
        canonical="https://letaiexplainai.com/feed"
      />
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
    </>
  );
}

export default FeedPage;
