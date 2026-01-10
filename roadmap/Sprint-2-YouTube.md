# Sprint 2: YouTube Integration

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-10 by Beans-bot

## Overview

Add YouTube as a content source. This sprint implements channel monitoring, video metadata fetching, and transcript extraction. YouTube transcripts flow through the existing AI pipeline for analysis.

## Prerequisites

- [x] Sprint 1 complete (FetcherRegistry in place)
- [x] YouTube Data API key obtained from Google Cloud Console
- [ ] API key stored in SSM: `/ai-timeline/prod/youtube-api-key` (stored in .env for local dev)

## Tasks

### 1. Install Dependencies

- [x] Add `youtube-transcript` package: `npm install youtube-transcript`
- [x] Add `googleapis` package: `npm install googleapis`
- [x] Add types if needed

### 2. YouTube API Service

Create a service layer for YouTube Data API interactions.

- [x] Create `server/src/services/youtube/youtubeApi.ts`:
  ```typescript
  class YouTubeApiService {
    // Get channel info by ID or handle
    getChannel(channelId: string): Promise<Channel>

    // Get recent videos from channel (last 50)
    getChannelVideos(channelId: string, since?: Date): Promise<Video[]>

    // Get playlist videos
    getPlaylistVideos(playlistId: string, since?: Date): Promise<Video[]>

    // Get video details
    getVideoDetails(videoId: string): Promise<VideoDetails>
  }
  ```
- [x] Handle API quota limits (10k units/day free tier)
- [x] Cache channel metadata (channels rarely change)
- [x] Add quota tracking/logging

**API Quota Reference:**
| Operation | Cost |
|-----------|------|
| channels.list | 1 unit |
| playlistItems.list | 1 unit |
| videos.list | 1 unit |
| search.list | 100 units (avoid!) |

### 3. Transcript Extraction Service

- [x] Create `server/src/services/youtube/transcriptService.ts`:
  ```typescript
  class TranscriptService {
    // Get transcript for video
    getTranscript(videoId: string, lang?: string): Promise<Transcript | null>

    // Check if transcript available
    hasTranscript(videoId: string): Promise<boolean>

    // Format transcript as readable text
    formatTranscript(transcript: Transcript): string
  }
  ```
- [x] Handle missing transcripts gracefully (some videos don't have them)
- [x] Support language preference with fallback to English
- [x] Clean up transcript text (remove [Music], timestamps, etc.)
- [x] Truncate very long transcripts (>50k chars) intelligently

### 4. YouTubeFetcher Implementation

- [x] Create `server/src/services/ingestion/fetchers/YouTubeFetcher.ts`
- [x] Implement `Fetcher` interface
- [x] For channel sources:
  - Fetch recent videos via `getChannelVideos()`
  - Filter videos newer than `lastCheckedAt`
  - Extract transcript for each video
  - Return as `FetchedArticle[]`
- [x] For playlist sources:
  - Fetch playlist videos via `getPlaylistVideos()`
  - Same transcript extraction flow
- [x] Handle `includeShorts` config option
- [x] Implement `testConnection()`:
  - Validate channel/playlist exists
  - Return channel name and recent video count
  - Return sample of 3 recent videos
- [x] Register with `FetcherRegistry`

**FetchedArticle Mapping:**
```typescript
{
  externalUrl: `https://youtube.com/watch?v=${videoId}`,
  title: video.snippet.title,
  content: formattedTranscript || video.snippet.description,
  publishedAt: video.snippet.publishedAt,
  metadata: {
    videoId,
    channelId,
    channelTitle,
    duration,
    thumbnailUrl,
    hasTranscript: boolean
  }
}
```

### 5. Admin UI - Add YouTube Source

Update SourcesPage to support YouTube channel/playlist sources.

- [x] Add source type selector to "Add Source" dialog: ✅ Updated 2026-01-10
  - RSS Feed (existing)
  - YouTube Channel (new)
  - YouTube Playlist (new)
  - Web Scraper (Sprint 3)
- [x] Create `YouTubeSourceForm` component: ✅ Integrated into SourcesPage
  ```tsx
  // Fields:
  - Channel URL or ID (with URL parsing)
  - Or: Playlist URL or ID
  - Transcript language preference (default: en)
  - Include shorts? (checkbox)
  - Check frequency (hours)
  ```
- [ ] Add channel URL parser:
  - Handle: `youtube.com/@handle`, `youtube.com/channel/UC...`, `youtube.com/c/name`
  - Extract channel ID automatically (deferred - backend handles this)
- [x] Add "Test Connection" button that shows: ✅
  - Channel name and subscriber count
  - Recent videos preview
  - Transcript availability check
- [x] Display source type badges in source list ✅
- [x] Add YouTube icon for YouTube sources ✅

### 6. SubmitArticlePage - YouTube URL Support

Allow manual submission of individual YouTube videos.

- [ ] Detect YouTube URLs in the URL input field
- [ ] When YouTube URL detected:
  - Show "YouTube Video Detected" indicator
  - Fetch video metadata automatically
  - Extract and display transcript preview
  - Show "No transcript available" warning if missing
- [ ] Submit video through normal article flow
- [ ] Store video metadata in article metadata field

### 7. Lambda Updates

- [ ] Add YouTube API key to Lambda environment variables
- [ ] Update SAM template with new SSM parameter reference
- [ ] Ensure transcript extraction works in Lambda environment
- [ ] Add timeout handling for slow transcript fetches

## Acceptance Criteria

- [x] Can add YouTube channel as source via API ✅ Tested 2026-01-10
- [x] Can add YouTube channel as source via admin UI ✅ Updated 2026-01-10
- [x] New videos from channel appear in ingested articles (fetcher works)
- [x] Transcripts are extracted and stored as article content
- [x] Videos without transcripts show description instead
- [ ] Can manually submit YouTube video URL (UI not updated)
- [x] Test connection shows channel info and sample videos ✅ Tested with "Two Minute Papers"
- [x] Existing RSS sources unaffected

## Files to Create/Modify

**New Files:**
- [x] `server/src/services/youtube/youtubeApi.ts`
- [x] `server/src/services/youtube/transcriptService.ts`
- [x] `server/src/services/youtube/index.ts`
- [x] `server/src/services/ingestion/fetchers/YouTubeFetcher.ts`
- [x] `src/components/admin/YouTubeSourceForm.tsx` ✅ Integrated into SourcesPage

**Modified Files:**
- [x] `server/src/services/ingestion/fetchers/registry.ts`
- [x] `src/pages/admin/SourcesPage.tsx` ✅ Updated with multi-source support
- [ ] `src/pages/admin/SubmitArticlePage.tsx` (not updated yet)
- [ ] `infra/template.yaml` (SSM parameter) (not updated yet)
- [x] `package.json` (new deps)

## Testing Checklist

- [ ] Unit test: YouTube URL parsing (various formats)
- [ ] Unit test: Transcript formatting/cleaning
- [x] Integration: Fetch videos from test channel ✅ Two Minute Papers
- [x] Integration: Extract transcript from known video ✅
- [ ] E2E: Add YouTube channel source via UI (UI not ready)
- [ ] E2E: Submit individual YouTube video (UI not ready)
- [ ] Verify: Lambda can access YouTube API

## Notes for Future Developers

1. **API Key Security**: Never log or expose the YouTube API key. It's read from SSM at runtime.

2. **Quota Management**: The free tier allows ~10k API calls/day. With 1 unit per video fetch, this supports monitoring ~100 channels with 100 videos each. If quota becomes an issue, consider:
   - Reducing check frequency
   - Using RSS feeds for high-volume channels (YouTube provides RSS)
   - Upgrading to paid quota

3. **Transcript Fallbacks**: Not all videos have transcripts. Priority order:
   1. Manual captions (best quality)
   2. Auto-generated captions
   3. Video description (last resort)

4. **Shorts Handling**: YouTube Shorts are often low-content. The `includeShorts` flag lets users opt-in. Shorts are identified by duration < 60 seconds.

5. **Channel ID Resolution**: YouTube has multiple URL formats. Always resolve to the canonical `UC...` channel ID and store that, not the vanity URL.
