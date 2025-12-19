# Sprint 31: Admin Review Queue

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 30 (AI Analysis Pipeline)

## Overview

Build the admin review workflow where curated content candidates are reviewed, edited, and published. Admins can approve/reject AI-generated drafts, edit before publishing, and track what's been published.

**Goal**: Complete review-to-publish workflow for news events and milestones.

---

## Tasks

### 31.1 Review Queue API Endpoints
- [ ] Create `server/src/routes/review.ts`
- [ ] Create `server/src/controllers/review.ts`
- [ ] Implement endpoints:
  - `GET /api/admin/review/queue` - Get pending drafts (with filters)
  - `GET /api/admin/review/:draftId` - Get single draft with article context
  - `PUT /api/admin/review/:draftId` - Update draft content
  - `POST /api/admin/review/:draftId/approve` - Approve and publish
  - `POST /api/admin/review/:draftId/reject` - Reject with notes

### 31.2 Publish Logic - News Events
- [ ] Create `server/src/services/publishing/newsPublisher.ts`
- [ ] On approve:
  - Validate draft matches CurrentEvent schema
  - Add to `events.json` (or migrate to DB - see notes)
  - Update draft status to "published"
  - Link published event ID back to draft
- [ ] Handle prerequisite milestone ID resolution (from titles to IDs)

### 31.3 Publish Logic - Milestones
- [ ] Create `server/src/services/publishing/milestonePublisher.ts`
- [ ] On approve:
  - Validate draft matches Milestone schema
  - Call existing `milestonesService.create()`
  - Update draft status to "published"
  - Link published milestone ID back to draft

### 31.4 Review Queue Page
- [ ] Create `src/pages/admin/ReviewQueuePage.tsx`
- [ ] Add route `/admin/review`
- [ ] Add to admin sidebar (prominent position)
- [ ] Tab navigation: All | News Events | Milestones | Glossary
- [ ] Show pending count badges on tabs
- [ ] List drafts with: title, type, source, relevance score, date
- [ ] Quick actions: Approve, Reject, Edit

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
- [ ] Create `src/components/admin/ReviewDetailModal.tsx`
- [ ] Split view: Original article | Draft content
- [ ] Editable draft fields (inline or form)
- [ ] For news events:
  - Edit headline, summary, connection explanation
  - Select prerequisite milestones (autocomplete)
  - Toggle featured flag
- [ ] For milestones:
  - Edit all milestone fields
  - Category dropdown
  - Significance slider (1-4)
- [ ] Show AI rationale for milestone recommendation
- [ ] Approve / Reject / Save Draft buttons

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
- [ ] Add "Published" tab to review queue (or separate page)
- [ ] Show recently published items
- [ ] Link to published content (news page, milestone page)
- [ ] Show publish date and source article

### 31.7 Dashboard Integration
- [ ] Add review queue stats to admin dashboard
- [ ] Show: Pending review count, Published this week
- [ ] Quick link to review queue

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

- [ ] Review queue shows all pending drafts
- [ ] Can filter by content type (news/milestone/glossary)
- [ ] Can edit draft content before approval
- [ ] Approve publishes to correct destination
- [ ] Reject marks draft as rejected with notes
- [ ] Published items appear on site
- [ ] Dashboard shows review queue status

---

## Notes

- Glossary publishing deferred to Sprint 32
- Focus on news events and milestones first
- Keep edit UI simple - improve based on usage
- Consider adding "needs revision" status for drafts that need AI regeneration
