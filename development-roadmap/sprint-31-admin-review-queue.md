# Sprint 31: Admin Review Queue

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 30 (AI Analysis Pipeline)

## Overview

Build the admin review workflow where curated content candidates are reviewed, edited, and published. Admins can approve/reject AI-generated drafts, edit before publishing, and track what's been published.

**Goal**: Complete review-to-publish workflow for news events and milestones.

---

## Tasks

### 31.1 Review Queue API Endpoints
- [x] Create `server/src/routes/review.ts`
- [x] Create `server/src/controllers/review.ts`
- [x] Implement endpoints:
  - `GET /api/admin/review/queue` - Get pending drafts (with filters)
  - `GET /api/admin/review/counts` - Get queue counts by type
  - `GET /api/admin/review/published` - Get recently published items
  - `GET /api/admin/review/:draftId` - Get single draft with article context
  - `PUT /api/admin/review/:draftId` - Update draft content
  - `POST /api/admin/review/:draftId/approve` - Approve and publish
  - `POST /api/admin/review/:draftId/reject` - Reject with notes

### 31.2 Publish Logic - News Events
- [x] Create `server/src/services/publishing/newsPublisher.ts`
- [x] On approve:
  - Validate draft matches CurrentEvent schema
  - Add to `events.json` (Option A - JSON file storage)
  - Update draft status to "published"
  - Link published event ID back to draft
- [x] Auto-generate unique event IDs
- [x] Auto-calculate expiration date (6 months from publish)

### 31.3 Publish Logic - Milestones
- [x] Create `server/src/services/publishing/milestonePublisher.ts`
- [x] On approve:
  - Validate draft matches Milestone schema
  - Create milestone in database via Prisma
  - Update draft status to "published"
  - Link published milestone ID back to draft

### 31.4 Review Queue Page
- [x] Create `src/pages/admin/ReviewQueuePage.tsx`
- [x] Add route `/admin/review`
- [x] Add to admin sidebar (prominent position, second item)
- [x] Tab navigation: All | News Events | Milestones | Glossary | Published
- [x] Show pending count badges on tabs
- [x] List drafts with: title, type, source, relevance score, date
- [x] Quick actions: Approve, Reject, View & Edit

```
┌────────────────────────────────────────────────────────────────┐
│ Review Queue                                                    │
├────────────────────────────────────────────────────────────────┤
│ ○ All (12)  ● News Events (8)  ○ Milestones (3)  ○ Glossary (1)│
├────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 📰 NEWS EVENT                           Relevance: 0.92    │ │
│ │ "OpenAI Releases GPT-5 Preview"                            │ │
│ │ Source: The Neuron Daily • Dec 18, 2024                    │ │
│ │                                                            │ │
│ │ [View & Edit]              [Quick Approve]       [Reject]  │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🏆 MILESTONE CANDIDATE                  Relevance: 0.95    │ │
│ │ "GPT-5: First Model to Pass PhD-Level Reasoning"           │ │
│ │ Source: The Neuron Daily • Dec 18, 2024                    │ │
│ │                                                            │ │
│ │ [View & Edit]              [Quick Approve]       [Reject]  │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 31.5 Review Detail Modal/Page
- [x] Create `src/components/admin/ReviewDetailModal.tsx`
- [x] Split view: Original article | Draft content
- [x] Editable draft fields (form-based)
- [x] For news events:
  - Edit headline, summary, connection explanation
  - Edit prerequisite milestones (comma-separated IDs)
  - Toggle featured flag
- [x] For milestones:
  - Edit all milestone fields
  - Category dropdown
  - Significance dropdown (1-4)
- [x] Show AI rationale for milestone recommendation
- [x] Approve / Reject / Save Draft buttons

```
┌──────────────────────────────────────────────────────────────────┐
│ Review: OpenAI Releases GPT-5 Preview                      [×]   │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌────────────────────────────────┐ │
│ │ ORIGINAL ARTICLE         │ │ NEWS EVENT DRAFT               │ │
│ │                          │ │                                │ │
│ │ OpenAI today announced...│ │ Headline:                      │ │
│ │                          │ │ [OpenAI Releases GPT-5 Prev___]│ │
│ │ The new model shows...   │ │                                │ │
│ │                          │ │ Summary:                       │ │
│ │ "This represents a major │ │ [OpenAI announced GPT-5, a    ]│ │
│ │ leap forward," said CEO..│ │ [major advancement in...      ]│ │
│ │                          │ │                                │ │
│ │ [Read full article ↗]    │ │ Prerequisites:                 │ │
│ │                          │ │ [GPT-4 (2023)] [×]             │ │
│ │                          │ │ [Transformer] [×]              │ │
│ │                          │ │ [+ Add milestone]              │ │
│ │                          │ │                                │ │
│ │                          │ │ ☑ Featured                     │ │
│ └──────────────────────────┘ └────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ AI Rationale: "This represents a significant advancement..."     │
├──────────────────────────────────────────────────────────────────┤
│ Rejection note: [_________________________________]              │
│                                                                  │
│ [Cancel]         [Reject]        [Save Draft]   [Approve & Publish]│
└──────────────────────────────────────────────────────────────────┘
```

### 31.6 Published Content Tracking
- [x] Add "Published" tab to review queue
- [x] Show recently published items
- [x] Show publish date and source article
- [x] Display published ID for reference

### 31.7 Dashboard Integration
- [x] Add review queue stats to admin dashboard
- [x] Show: Pending review count, Published this week, Active sources
- [x] Quick link to review queue and sources

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Pending      │ │ Published    │ │ Sources      │
│ Review       │ │ This Week    │ │ Active       │
│    12        │ │    5         │ │    2         │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## File Structure

```
server/src/
├── routes/
│   └── review.ts                 # NEW
├── controllers/
│   └── review.ts                 # NEW
├── services/
│   └── publishing/
│       ├── newsPublisher.ts      # NEW
│       └── milestonePublisher.ts # NEW

src/pages/admin/
└── ReviewQueuePage.tsx           # NEW

src/components/admin/
└── ReviewDetailModal.tsx         # NEW
```

---

## News Events Storage Decision

**Option A: Keep JSON file (simpler)**
- Append to `src/content/current-events/events.json`
- Requires rebuild/redeploy to see changes
- Fine for low volume (few per week)

**Option B: Migrate to database (more flexible)**
- Add `CurrentEvent` model to Prisma
- API serves events dynamically
- Changes visible immediately
- Better for higher volume

**Recommendation**: Start with Option A, migrate if volume increases.

---

## Success Criteria

- [x] Review queue shows all pending drafts
- [x] Can filter by content type (news/milestone/glossary)
- [x] Can edit draft content before approval
- [x] Approve publishes to correct destination
- [x] Reject marks draft as rejected with notes
- [x] Published tab shows recently published items
- [x] Dashboard shows review queue status

---

## Notes

- Glossary publishing deferred to Sprint 32
- Focus on news events and milestones first
- Keep edit UI simple - improve based on usage
- Consider adding "needs revision" status for drafts that need AI regeneration
