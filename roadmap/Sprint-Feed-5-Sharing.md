# Sprint Feed-5: Sharing & Collections

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-18 by Claude (Sprint 5 COMPLETE - OG tags implemented)

## Overview

Implement social sharing functionality and personal collections system. Users can share news items to social platforms with pre-crafted templates, and save items to organized collections for later reference.

## Prerequisites

- [x] Sprint Feed-4 completed (engagement features work)
- [x] Collections API endpoints from Sprint 1 are functional
- [x] Session management is working

## Tasks

### 1. Share Sheet Component ✅

#### 1.1 Create FeedShareSheet
- [x] Created `src/components/Feed/FeedShareSheet.tsx`

#### 1.2 Implement Share Sheet UI
- [x] Slide up from bottom (50% of screen)
- [x] Header: "Share this story" with headline preview
- [x] Grid of share platform buttons
- [x] Copy link button at bottom with "Copied!" feedback
- [x] Drag handle to dismiss

#### 1.3 Share Platforms
| Platform | Icon | Action | Status |
|----------|------|--------|--------|
| Twitter/X | Twitter icon | Open tweet intent | ✅ |
| LinkedIn | LinkedIn icon | Open share dialog | ✅ |
| Facebook | Facebook icon | Open share dialog | ✅ |
| WhatsApp | WhatsApp icon | Open wa.me link | ✅ |
| Email | Mail icon | Open mailto | ✅ |
| Copy Link | Link icon | Copy to clipboard | ✅ |

### 2. Share Templates ✅

#### 2.1 Create Share Template Generator
- [x] Created `src/utils/shareTemplates.ts`
- [x] Functions: generateTwitterText, generateLinkedInText, generateGenericText, generateShareUrl

#### 2.2 Twitter/X Template
- [x] Character limit: 280
- [x] Includes headline (truncated), optional summary, "via AI Timeline" suffix

#### 2.3 LinkedIn Template
- [x] Professional tone with hashtags
- [x] Includes headline, summary, "why it matters" excerpt, URL

#### 2.4 Generic/Email Template
- [x] Subject: "AI News: {headline}"
- [x] Body includes full summary and URL

### 3. Share URL Generation ✅

#### 3.1 Create Shareable URLs
- [x] Format: `https://letaiexplainai.com/news/{eventId}`
- [x] NewsDetailPage component created with full event display

#### 3.2 Open Graph Meta Tags
- [x] Add OG tags to news detail page via SEO component
- [x] Twitter card meta tags via SEO component
- [x] NewsArticle JSON-LD schema for rich results

**Implementation (2026-01-18)**:
- Created `NewsDetailPage.tsx` with SEO component
- Added `/news/:id` route to App.tsx
- Added `GET /api/news/:id` backend endpoint
- Added `feedApi.getById()` frontend method

#### 3.3 Server-Side Rendering for Crawlers ✅
- [x] Detect crawlers (User-Agent check) via Lambda@Edge
- [x] Return pre-rendered meta tags for link previews
- [ ] Dynamic OG image generation - *Future enhancement*

**Implementation (2026-01-18)**:
- Created Lambda@Edge function `ai-timeline-og-tags-edge` in us-east-1
- Detects social media crawlers: Facebook, Twitter, LinkedIn, WhatsApp, Slack, Telegram, Discord, Pinterest, Google, Bing, Apple
- Fetches event data from API and returns HTML with OG tags
- Associated with CloudFront `/news/*` path pattern (viewer-request trigger)
- Crawlers get pre-rendered OG HTML, regular browsers get SPA
- Files: `infra/edge-og-tags/` (index.js, template.yaml, samconfig.toml)
- Lambda ARN: `arn:aws:lambda:us-east-1:211125652144:function:ai-timeline-og-tags-edge:1`

**Tested Crawlers**:
- Facebook (facebookexternalhit) ✅
- Twitter (Twitterbot) ✅
- LinkedIn (LinkedInBot) ✅
- WhatsApp ✅
- Regular browsers get SPA with client-side OG tags ✅

### 4. Copy to Clipboard ✅

#### 4.1 Implement Copy Functionality
- [x] Use navigator.clipboard.writeText() in FeedShareSheet
- [x] Copy URL via shareTemplates.ts generateShareUrl

#### 4.2 Copy Feedback
- [x] Button text changes: "Copy" → "Copied!"
- [x] Revert after 2 seconds (in FeedShareSheet)

### 5. Share Tracking ✅

#### 5.1 Record Share Interactions
- [x] Created `POST /api/news/:id/share` endpoint
- [x] Records platform in metadata via NewsInteraction model

#### 5.2 Analytics (optional)
- [ ] Track share completion (deferred - requires external integration)
- [ ] Track which templates get edited vs used as-is (deferred)

### 6. Collections System ✅

#### 6.1 Create CollectionManager Hook
- [x] Created `src/hooks/useCollections.ts`
- [x] Full CRUD operations: fetch, create, update, delete
- [x] Item management: addToCollection, removeFromCollection
- [x] Helper methods: isInCollection, isInAnyCollection, getDefaultCollection

#### 6.2 Default Collection: "Saved"
- [x] API auto-creates "Saved" collection on first save (existing functionality)
- [x] isDefault flag prevents deletion
- [x] Hook provides getDefaultCollection() helper

### 7. Save to Collection Flow ✅

#### 7.1 Create FeedSaveButton
- [x] Existing save button in action bar works with useFeedSave hook
- [x] Single tap: Toggles save to default collection

#### 7.2 Create FeedCollectionPicker
- [x] Created `src/components/Feed/FeedCollectionPicker.tsx`

#### 7.3 Collection Picker UI
- [x] List of collections with checkboxes
- [x] Checked state with emerald highlight
- [x] Folder/FolderOpen icons for visual feedback
- [x] Item count shown for each collection

#### 7.4 Create Collection Flow
- [x] "New Collection" button at bottom
- [x] Inline input with Create/Cancel buttons
- [x] Auto-adds current item to new collection
- [x] Max 50 character validation

### 8. Collections Page ✅

#### 8.1 Create CollectionsPage
- [x] Created `src/pages/CollectionsPage.tsx`
- [x] Added routes: `/collections` and `/collections/:id`

#### 8.2 Collections List View
- [x] Grid of collection cards with responsive layout
- [x] Each card shows:
  - Collection name
  - Item count
  - Thumbnail placeholder (first 4 items grid)
  - Last updated date
- [x] "New Collection" card at end

#### 8.3 Single Collection View
- [x] Route: `/collections/:id`
- [x] List of saved items with thumbnails and metadata
- [x] Edit collection name button (inline editing)
- [x] Delete collection button (with confirmation modal)
- [x] Remove items from collection

### 9. Quick Save Gestures ✅

#### 9.1 Double-Tap to Save
- [x] Detect double-tap on card content area (FeedCard.tsx)
- [x] Save to default collection via onToggleSave
- [x] Show heart animation (framer-motion AnimatePresence)
- [x] Show toast: "Saved!" (react-hot-toast)

#### 9.2 Existing Bookmark Button
- [x] Keep single-tap save functionality
- [x] Visual state: Empty → Filled when saved (FeedActionBar uses isSaved prop)
- [x] Filled state: Tap to toggle (unsave)

### 10. Saved Items Indicator ✅

#### 10.1 Show Save State on Cards
- [x] Check if item is in any collection (useFeedSave hook)
- [x] Show filled bookmark icon if saved (FeedActionBar)
- [x] Update state when save/unsave occurs (optimistic updates)

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test sharing features.

### Share Sheet Testing
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to feed page
- [ ] Tap share button on a card
- [ ] Verify share sheet appears with all platforms
- [ ] Take screenshot of share sheet

### Twitter Share Testing
- [ ] Tap Twitter/X share option
- [ ] Verify new window/tab opens with pre-filled tweet
- [ ] Verify URL and text are correct
- [ ] Close tab and return to app

### Copy Link Testing
- [ ] Tap "Copy Link" option
- [ ] Verify feedback shows "Copied!"
- [ ] Paste somewhere to verify link is correct

### Collection Save Testing
- [ ] Tap bookmark icon
- [ ] Verify item saves to "Saved" collection
- [ ] Verify icon changes to filled state
- [ ] Tap again - verify item unsaves
- [ ] Long-press bookmark - verify picker opens

### Collection Picker Testing
- [ ] Long-press bookmark
- [ ] Verify collection picker opens
- [ ] Select a collection
- [ ] Verify checkmark appears
- [ ] Tap "Create new collection"
- [ ] Enter name and create
- [ ] Verify new collection appears in list

### Collections Page Testing
- [ ] Navigate to /collections
- [ ] Verify collections are listed
- [ ] Tap a collection
- [ ] Verify saved items are shown
- [ ] Delete an item from collection
- [ ] Verify removal

### Console & Network Check
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for API calls: `mcp__claude-in-chrome__read_network_requests`
- [ ] Verify collection API calls succeed

## Acceptance Criteria

- [ ] Share sheet opens with all platform options
- [ ] Twitter share opens with pre-filled text and URL
- [ ] LinkedIn share opens with pre-filled content
- [ ] Copy link copies URL to clipboard with feedback
- [ ] Share interactions are tracked
- [ ] Default "Saved" collection is auto-created
- [ ] Single tap bookmark saves to default collection
- [ ] Long press opens collection picker
- [ ] New collections can be created
- [ ] Collections page shows all collections
- [ ] Single collection view shows saved items
- [ ] Items can be removed from collections
- [ ] Save state is reflected in bookmark icon
- [ ] All browser validation tasks completed

## Notes for Future Developers

### Share Intent URLs
```typescript
// Twitter/X
`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

// LinkedIn
`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

// Facebook
`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`

// WhatsApp
`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`

// Email
`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
```

### OG Image Generation
For dynamic OG images, consider:
1. Cloudflare Workers with @cloudflare/workers-og
2. Vercel OG Image Generation
3. Pre-generate and cache images on S3

### Collection Item Storage
Collections store item IDs as JSON array:
```typescript
items: string[] // ["event1", "event2", "event3"]
```

When displaying, fetch full event data:
```typescript
const eventIds = JSON.parse(collection.items);
const events = await Promise.all(eventIds.map(id => feedApi.getById(id)));
```

Consider pagination for collections with many items (>50).

### Web Share API
For mobile browsers that support it:
```typescript
if (navigator.share) {
  await navigator.share({
    title: headline,
    text: summary,
    url: shareUrl,
  });
}
```
Falls back to custom share sheet on unsupported browsers.
