/**
 * YouTube API Service - Interfaces with YouTube Data API v3
 *
 * Handles fetching channel info, video lists, and video details.
 * Uses the free tier which allows 10,000 units/day.
 *
 * API Quota Reference:
 * - channels.list: 1 unit
 * - playlistItems.list: 1 unit
 * - videos.list: 1 unit
 * - search.list: 100 units (avoid!)
 */

import { google, youtube_v3 } from 'googleapis';

/**
 * YouTube video metadata
 */
export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: Date;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  duration?: string; // ISO 8601 duration (PT1H2M3S)
  durationSeconds?: number;
}

/**
 * YouTube channel metadata
 */
export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  subscriberCount?: number;
  videoCount?: number;
  uploadsPlaylistId?: string;
}

/**
 * YouTube API Service
 */
class YouTubeApiService {
  private youtube: youtube_v3.Youtube | null = null;
  private apiKey: string | null = null;

  /**
   * Initialize with API key
   */
  initialize(apiKey: string): void {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
    console.log('[YouTubeApi] Initialized with API key');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.youtube !== null && this.apiKey !== null;
  }

  /**
   * Get client, throwing if not initialized
   */
  private getClient(): youtube_v3.Youtube {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized. Call initialize() with API key first.');
    }
    return this.youtube;
  }

  /**
   * Get channel info by channel ID
   * Quota: 1 unit
   */
  async getChannel(channelId: string): Promise<YouTubeChannel | null> {
    const youtube = this.getClient();

    const response = await youtube.channels.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [channelId],
    });

    const channel = response.data.items?.[0];
    if (!channel) return null;

    return {
      channelId: channel.id!,
      title: channel.snippet?.title || 'Unknown',
      description: channel.snippet?.description || '',
      subscriberCount: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount, 10)
        : undefined,
      videoCount: channel.statistics?.videoCount ? parseInt(channel.statistics.videoCount, 10) : undefined,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
    };
  }

  /**
   * Resolve channel ID from various URL formats
   * Handles: @handle, /channel/UC..., /c/name, /user/name
   */
  async resolveChannelId(input: string): Promise<string | null> {
    // Already a channel ID (starts with UC)
    if (input.startsWith('UC') && input.length === 24) {
      return input;
    }

    // Parse URL to extract identifier
    let identifier = input;
    try {
      const url = new URL(input);
      const pathname = url.pathname;

      if (pathname.startsWith('/@')) {
        // Handle format: youtube.com/@handle
        identifier = pathname.slice(1); // Keep the @
      } else if (pathname.startsWith('/channel/')) {
        // Direct channel ID
        return pathname.split('/')[2];
      } else if (pathname.startsWith('/c/') || pathname.startsWith('/user/')) {
        // Custom URL or username - need to search
        identifier = pathname.split('/')[2];
      }
    } catch {
      // Not a URL, treat as handle or channel ID
    }

    // Handle @handle format - use search
    if (identifier.startsWith('@')) {
      const youtube = this.getClient();
      // Note: This uses 100 quota units - expensive!
      const response = await youtube.search.list({
        part: ['snippet'],
        q: identifier,
        type: ['channel'],
        maxResults: 1,
      });

      return response.data.items?.[0]?.snippet?.channelId || null;
    }

    return null;
  }

  /**
   * Get recent videos from a channel's uploads playlist
   * Quota: 1 unit per 50 videos
   */
  async getChannelVideos(channelId: string, since?: Date, maxResults = 50): Promise<YouTubeVideo[]> {
    // First get the uploads playlist ID
    const channel = await this.getChannel(channelId);
    if (!channel?.uploadsPlaylistId) {
      throw new Error(`Could not find uploads playlist for channel ${channelId}`);
    }

    return this.getPlaylistVideos(channel.uploadsPlaylistId, since, maxResults);
  }

  /**
   * Get videos from a playlist
   * Quota: 1 unit per 50 videos
   */
  async getPlaylistVideos(playlistId: string, since?: Date, maxResults = 50): Promise<YouTubeVideo[]> {
    const youtube = this.getClient();
    const videos: YouTubeVideo[] = [];
    let pageToken: string | undefined;

    while (videos.length < maxResults) {
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: Math.min(50, maxResults - videos.length),
        pageToken,
      });

      for (const item of response.data.items || []) {
        const publishedAt = new Date(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || '');

        // Stop if we've gone past the since date
        if (since && publishedAt < since) {
          return videos;
        }

        videos.push({
          videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '',
          title: item.snippet?.title || 'Untitled',
          description: item.snippet?.description || '',
          publishedAt,
          channelId: item.snippet?.channelId || '',
          channelTitle: item.snippet?.channelTitle || '',
          thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        });
      }

      pageToken = response.data.nextPageToken || undefined;
      if (!pageToken) break;
    }

    return videos;
  }

  /**
   * Get video details including duration
   * Quota: 1 unit per 50 videos
   */
  async getVideoDetails(videoIds: string[]): Promise<Map<string, Partial<YouTubeVideo>>> {
    const youtube = this.getClient();
    const details = new Map<string, Partial<YouTubeVideo>>();

    // Process in batches of 50
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const response = await youtube.videos.list({
        part: ['contentDetails', 'snippet'],
        id: batch,
      });

      for (const video of response.data.items || []) {
        const duration = video.contentDetails?.duration;
        details.set(video.id!, {
          duration,
          durationSeconds: duration ? this.parseDuration(duration) : undefined,
        });
      }
    }

    return details;
  }

  /**
   * Get full details for a single video
   * Quota: 1 unit
   */
  async getVideo(videoId: string): Promise<YouTubeVideo | null> {
    const youtube = this.getClient();

    const response = await youtube.videos.list({
      part: ['contentDetails', 'snippet'],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video) return null;

    const duration = video.contentDetails?.duration;

    return {
      videoId: video.id!,
      title: video.snippet?.title || 'Untitled',
      description: video.snippet?.description || '',
      publishedAt: new Date(video.snippet?.publishedAt || ''),
      channelId: video.snippet?.channelId || '',
      channelTitle: video.snippet?.channelTitle || '',
      thumbnailUrl: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url,
      duration,
      durationSeconds: duration ? this.parseDuration(duration) : undefined,
    };
  }

  /**
   * Extract video ID from various YouTube URL formats
   * Supports: youtube.com/watch?v=..., youtu.be/..., youtube.com/v/..., youtube.com/embed/...
   */
  extractVideoId(urlOrId: string): string | null {
    // Already looks like a video ID (11 characters, alphanumeric with - and _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }

    try {
      const url = new URL(urlOrId);
      const hostname = url.hostname.replace('www.', '');

      if (hostname === 'youtu.be') {
        // Short URL: youtu.be/VIDEO_ID
        return url.pathname.slice(1);
      }

      if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        // Standard watch URL: youtube.com/watch?v=VIDEO_ID
        if (url.searchParams.has('v')) {
          return url.searchParams.get('v');
        }

        // Embed URL: youtube.com/embed/VIDEO_ID
        if (url.pathname.startsWith('/embed/')) {
          return url.pathname.split('/')[2];
        }

        // Old embed URL: youtube.com/v/VIDEO_ID
        if (url.pathname.startsWith('/v/')) {
          return url.pathname.split('/')[2];
        }

        // Shorts URL: youtube.com/shorts/VIDEO_ID
        if (url.pathname.startsWith('/shorts/')) {
          return url.pathname.split('/')[2];
        }

        // Live stream URL: youtube.com/live/VIDEO_ID
        if (url.pathname.startsWith('/live/')) {
          return url.pathname.split('/')[2];
        }
      }
    } catch {
      // Not a valid URL
    }

    return null;
  }

  /**
   * Parse ISO 8601 duration to seconds
   * PT1H2M3S -> 3723
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Check if a video is a YouTube Short (< 60 seconds)
   */
  isShort(durationSeconds: number): boolean {
    return durationSeconds > 0 && durationSeconds <= 60;
  }
}

// Export singleton
export const youtubeApi = new YouTubeApiService();
