/**
 * Feed Types (Sprint Feed-1)
 *
 * TypeScript types for the TikTok-style news feed system.
 */

/**
 * News event item in the feed with engagement data
 */
export interface FeedItem {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string | null;
  sourcePublisher: string | null;
  publishedDate: string;
  featured: boolean;
  mediaType: 'text' | 'video' | 'audio';
  videoId: string | null;
  thumbnailUrl: string | null;
  upvotes: number;
  downvotes: number;
  viewCount: number;
  hotScore: number;
  commentCount: number;
  whyItMatters: string | null;
  connectionExplanation: string;
  // User-specific state (set by frontend based on session)
  userVote?: 'up' | 'down' | null;
  isSaved?: boolean;
}

/**
 * Feed API response
 */
export interface FeedResponse {
  items: FeedItem[];
  hasMore: boolean;
}

/**
 * Vote action response
 */
export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

/**
 * Interaction action types
 */
export type InteractionAction =
  | 'view'
  | 'upvote'
  | 'downvote'
  | 'save'
  | 'share'
  | 'chat'
  | 'swipe_past'
  | 'not_interested'
  | 'engage'
  | 'read_context'
  | 'watch_video'
  | 'view_concepts';

/**
 * News interaction record
 */
export interface NewsInteraction {
  id: string;
  sessionId: string;
  eventId: string;
  action: InteractionAction;
  metadata?: string;
  createdAt: string;
}

/**
 * Saved collection
 */
export interface SavedCollection {
  id: string;
  sessionId: string;
  userId: string | null;
  name: string;
  items: string[];
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feed session data stored in sessionStorage
 */
export interface FeedSessionData {
  sessionId: string;
  seenIds: string[];
  sessionStart: string;
  itemsViewed: number;
  conceptsLearned: number;
}

/**
 * Share platform options
 */
export type SharePlatform =
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'whatsapp'
  | 'email'
  | 'copy';

/**
 * Feed filter options
 */
export type FeedFilter = 'hot' | 'trending' | 'fresh';

/**
 * Feed statistics (for admin)
 */
export interface FeedStats {
  totalEvents: number;
  totalInteractions: number;
  interactionsByType: Record<InteractionAction, number>;
  topEngagedEvents: Array<{
    id: string;
    headline: string;
    upvotes: number;
    downvotes: number;
    viewCount: number;
    completionCount: number;
    hotScore: number;
  }>;
  recentActivity: number;
}
