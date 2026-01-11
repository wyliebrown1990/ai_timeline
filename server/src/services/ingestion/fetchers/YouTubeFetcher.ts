/**
 * YouTubeFetcher - Fetcher implementation for YouTube channels and playlists
 *
 * Monitors YouTube channels for new videos, extracts transcripts,
 * and returns them as articles for AI analysis.
 */

import type { SourceType } from '@prisma/client';
import { youtubeApi, type YouTubeVideo } from '../../youtube/youtubeApi';
import { transcriptService } from '../../youtube/transcriptService';
import type {
  Fetcher,
  FetchedArticle,
  FetcherSource,
  SourceConfig,
  TestConnectionResult,
  YouTubeChannelConfig,
  YouTubePlaylistConfig,
} from './types';
import { isYouTubeChannelConfig, isYouTubePlaylistConfig } from './types';

/**
 * YouTubeFetcher - Fetches videos from YouTube channels and playlists
 */
export class YouTubeFetcher implements Fetcher {
  readonly sourceType: SourceType = 'youtube_channel';

  /**
   * Check if this fetcher can handle the source type
   */
  canHandle(sourceType: SourceType): boolean {
    return sourceType === 'youtube_channel' || sourceType === 'youtube_playlist';
  }

  /**
   * Fetch videos from a YouTube source
   */
  async fetch(source: FetcherSource): Promise<FetchedArticle[]> {
    this.ensureInitialized();

    const config = source.config;
    let videos: YouTubeVideo[];

    if (source.sourceType === 'youtube_channel' && isYouTubeChannelConfig(config)) {
      videos = await this.fetchChannelVideos(config);
    } else if (source.sourceType === 'youtube_playlist' && isYouTubePlaylistConfig(config)) {
      videos = await this.fetchPlaylistVideos(config);
    } else {
      throw new Error(`Invalid config for source type ${source.sourceType}`);
    }

    console.log(`[YouTubeFetcher] Found ${videos.length} videos from ${source.name}`);

    // Convert videos to articles with transcripts
    const articles: FetchedArticle[] = [];

    for (const video of videos) {
      try {
        const article = await this.videoToArticle(video, config);
        articles.push(article);
      } catch (error) {
        console.warn(`[YouTubeFetcher] Failed to process video ${video.videoId}:`, error);
        // Continue with other videos
      }
    }

    console.log(`[YouTubeFetcher] Successfully processed ${articles.length} videos`);
    return articles;
  }

  /**
   * Test connection to a YouTube source
   */
  async testConnection(config: SourceConfig): Promise<TestConnectionResult> {
    this.ensureInitialized();

    try {
      if (isYouTubeChannelConfig(config)) {
        // Resolve channel ID from URL or handle
        const resolvedChannelId = await youtubeApi.resolveChannelId(config.channelId);
        if (!resolvedChannelId) {
          return {
            success: false,
            message: `Could not resolve channel ID from: ${config.channelId}`,
          };
        }

        const channel = await youtubeApi.getChannel(resolvedChannelId);
        if (!channel) {
          return {
            success: false,
            message: `Channel not found: ${resolvedChannelId}`,
          };
        }

        // Get sample videos
        const videos = await youtubeApi.getChannelVideos(resolvedChannelId, undefined, 3);
        const sampleArticles = await Promise.all(
          videos.slice(0, 3).map(async (video) => {
            const hasTranscript = await transcriptService.hasTranscript(video.videoId);
            return {
              externalUrl: `https://youtube.com/watch?v=${video.videoId}`,
              title: video.title,
              content: hasTranscript ? '[Transcript available]' : video.description.substring(0, 200),
              publishedAt: video.publishedAt,
            };
          })
        );

        return {
          success: true,
          message: `Connected to channel: ${channel.title}`,
          sampleArticles,
          sourceInfo: {
            name: channel.title,
            description: channel.description.substring(0, 200),
            itemCount: channel.videoCount,
          },
        };
      }

      if (isYouTubePlaylistConfig(config)) {
        const videos = await youtubeApi.getPlaylistVideos(config.playlistId, undefined, 3);
        if (videos.length === 0) {
          return {
            success: false,
            message: `Playlist is empty or not found: ${config.playlistId}`,
          };
        }

        const sampleArticles = videos.slice(0, 3).map((video) => ({
          externalUrl: `https://youtube.com/watch?v=${video.videoId}`,
          title: video.title,
          content: video.description.substring(0, 200),
          publishedAt: video.publishedAt,
        }));

        return {
          success: true,
          message: `Connected to playlist with ${videos.length}+ videos`,
          sampleArticles,
          sourceInfo: {
            itemCount: videos.length,
          },
        };
      }

      return {
        success: false,
        message: 'Invalid YouTube configuration',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to YouTube',
      };
    }
  }

  /**
   * Fetch videos from a channel
   */
  private async fetchChannelVideos(config: YouTubeChannelConfig): Promise<YouTubeVideo[]> {
    // Resolve channel ID from URL or handle
    const resolvedChannelId = await youtubeApi.resolveChannelId(config.channelId);
    if (!resolvedChannelId) {
      throw new Error(`Could not resolve channel ID from: ${config.channelId}`);
    }

    // Use config values with sensible defaults
    const maxVideos = Math.min(config.maxVideos || 20, 100); // Default 20, max 100

    // Calculate since date if historyDays is set
    let sinceDate: Date | undefined;
    if (config.historyDays && config.historyDays > 0) {
      sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - config.historyDays);
      console.log(
        `[YouTubeFetcher] Fetching videos from last ${config.historyDays} days (since ${sinceDate.toISOString()})`
      );
    }

    const videos = await youtubeApi.getChannelVideos(resolvedChannelId, sinceDate, maxVideos);
    console.log(
      `[YouTubeFetcher] Fetched ${videos.length} videos (maxVideos: ${maxVideos}, historyDays: ${config.historyDays || 'unlimited'})`
    );

    // Filter out shorts if not included
    if (!config.includeShorts) {
      const videoIds = videos.map((v) => v.videoId);
      const details = await youtubeApi.getVideoDetails(videoIds);

      return videos.filter((video) => {
        const detail = details.get(video.videoId);
        if (!detail?.durationSeconds) return true; // Keep if duration unknown
        return !youtubeApi.isShort(detail.durationSeconds);
      });
    }

    return videos;
  }

  /**
   * Fetch videos from a playlist
   */
  private async fetchPlaylistVideos(config: YouTubePlaylistConfig): Promise<YouTubeVideo[]> {
    return youtubeApi.getPlaylistVideos(config.playlistId, undefined, 20);
  }

  /**
   * Convert a YouTube video to a FetchedArticle
   */
  private async videoToArticle(
    video: YouTubeVideo,
    config: YouTubeChannelConfig | YouTubePlaylistConfig
  ): Promise<FetchedArticle> {
    // Try to get transcript
    const transcriptResult = await transcriptService.getTranscript(
      video.videoId,
      config.transcriptLanguage || 'en'
    );

    let content: string;
    let hasTranscript = false;

    if (transcriptResult.success && transcriptResult.transcript) {
      content = transcriptResult.transcript.fullText;
      hasTranscript = true;
      console.log(
        `[YouTubeFetcher] Got transcript for ${video.videoId} (${transcriptResult.transcript.wordCount} words)`
      );
    } else {
      // Fall back to description
      content = video.description || 'No transcript or description available.';
      console.log(`[YouTubeFetcher] No transcript for ${video.videoId}, using description`);
    }

    return {
      externalUrl: `https://youtube.com/watch?v=${video.videoId}`,
      title: video.title,
      content,
      publishedAt: video.publishedAt,
      metadata: {
        videoId: video.videoId,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl,
        hasTranscript,
        source: 'youtube',
      },
    };
  }

  /**
   * Ensure YouTube API is initialized
   */
  private ensureInitialized(): void {
    if (!youtubeApi.isInitialized()) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY environment variable not set');
      }
      youtubeApi.initialize(apiKey);
    }
  }
}

// Export singleton
export const youtubeFetcher = new YouTubeFetcher();
