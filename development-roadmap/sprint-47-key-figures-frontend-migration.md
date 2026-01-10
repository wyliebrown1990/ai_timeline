# Sprint 47: Key Figures - Frontend Display & Migration

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 46 (Pipeline Integration)

**Status**: DEPLOYED

## Overview

Complete the Key Figures feature by adding public-facing display components and migrating existing milestone contributors to the new system.

**Goal**: Users can browse Key Figures in the glossary, see contributors on milestones, and all existing contributor data is migrated.

---

## Phase 1: Glossary Integration

### 47.1 Add Key Figures Tab to Glossary
- [x] Modify glossary page to include "Key Figures" tab/section
- [x] Add tab navigation: [Terms] [Key Figures]
- [x] Route: `/glossary?tab=figures` or `/glossary/figures`
- [x] Maintain existing glossary term functionality

### 47.2 Create KeyFiguresList Component
- [x] Create `src/components/Glossary/KeyFiguresList.tsx`
- [x] Display figures in alphabetical grid/list
- [x] Show: Photo (placeholder if none), Name, Role badge, Organization
- [x] Add role filter (All, Researchers, Executives, Founders, etc.)
- [x] Add search input for name filtering
- [x] Implement pagination or infinite scroll

### 47.3 Create KeyFigureCard Component
- [x] Create `src/components/Glossary/KeyFigureCard.tsx`
- [x] Display thumbnail image (or initials placeholder)
- [x] Show canonical name
- [x] Show role as colored badge
- [x] Show primary organization
- [x] Show "Notable for" snippet (truncated)
- [x] Click opens detail modal

```tsx
interface KeyFigureCardProps {
  figure: KeyFigure;
  onClick: () => void;
}
```

---

## Phase 2: Key Figure Detail Modal

### 47.4 Create KeyFigureModal Component
- [x] Create `src/components/Glossary/KeyFigureModal.tsx`
- [x] Use Portal for proper z-index (project pattern)
- [x] Fixed overlay with backdrop blur
- [x] Escape key dismissal
- [x] Display all figure details

### 47.5 Modal Content Layout
- [x] Header: Large photo, Name, Role badge
- [x] Section: Short bio (prominent)
- [x] Section: Full bio (expandable if long)
- [x] Section: Organizations (current + previous timeline)
- [x] Section: Notable For
- [x] Section: Related Milestones (clickable links)
- [x] Footer: External links (Wikipedia, LinkedIn, Twitter)

### 47.6 Fetch Related Milestones
- [x] Call `keyFiguresApi.getMilestones(id)` on modal open
- [x] Display milestones sorted by date
- [x] Show milestone title, date, contribution type
- [x] Click milestone navigates to milestone detail

---

## Phase 3: Milestone Detail Enhancement

### 47.7 Update Milestone Detail Page
- [x] Modify milestone detail to show Key Figures section
- [x] Fetch contributors via API (MilestoneContributor join)
- [x] Display below description or in sidebar

### 47.8 Create ContributorChip Component
- [x] Create `src/components/Timeline/ContributorChip.tsx`
- [x] Small chip with figure name
- [x] Hover shows preview (via HoverCard)
- [x] Click opens KeyFigureModal

```tsx
// Example usage
<div className="flex flex-wrap gap-2">
  <span className="text-sm text-gray-500">Key Figures:</span>
  {contributors.map(c => (
    <ContributorChip key={c.keyFigureId} contributor={c} />
  ))}
</div>
```

### 47.9 Create ContributorHoverCard Component
- [x] Create `src/components/Timeline/ContributorHoverCard.tsx`
- [x] Use Portal to render to document.body (project pattern)
- [x] Position: Fixed, calculated from trigger element
- [x] Show: Photo, Name, Role, Short bio
- [x] Delay show (200ms) to prevent flicker
- [x] "View Profile" link opens modal

---

## Phase 4: Timeline Integration

### 47.10 Add Contributors to Timeline Cards
- [x] Modify `MilestoneCard` component to accept keyFigures prop
- [x] Show contributor chips (max 3, "+N more" overflow)
- [x] Chips clickable to open figure modal
- [x] Only show for milestones with linked figures
- [ ] Wire up Timeline component once API provides keyFigures data (Phase 6)

### 47.11 Add Figure Filter to Timeline
- [ ] Add "Key Figure" filter dropdown
- [ ] Filter milestones by contributor
- [ ] Search figures by name in dropdown
- [ ] Clear filter option
- Note: Depends on Phase 6 API updates

---

## Phase 5: Data Migration

### 47.12 Create Migration Script
- [x] Create migration in `server/src/controllers/migrations.ts`
- [x] Read all Milestones with non-empty `contributors` JSON
- [x] Parse contributor names
- [x] For each name:
  - Match against existing KeyFigures
  - Create KeyFigure if no match (status: draft for review)
  - Create MilestoneContributor link

### 47.13 Handle Name Variations in Migration
- [x] Use nameNormalizer and keyFigureMatcher
- [x] Log matches vs new creates
- [x] Store original name as alias if variant matched
- [x] Track migration progress

### 47.14 Create Migration Admin Endpoint
- [x] `POST /api/admin/migrations/contributors`
- [x] Triggers migration script
- [x] Returns: total processed, matched, created, errors
- [x] Idempotent (can run multiple times safely)

### 47.15 Review Migrated Figures
- [ ] After migration, new figures have status: 'draft'
- [ ] Admin reviews in existing Key Figures list
- [ ] Publish valid figures
- [ ] Merge duplicates as needed
- [ ] Delete invalid entries
Note: Review step is manual admin workflow after running migration

---

## Phase 6: API Updates

### 47.16 Update Milestones API
- [x] `GET /api/milestones` - Include keyFigures in response
- [x] Add `includeContributors=true` query param (default false for perf)
- [x] Return nested contributor data
- [x] `GET /api/milestones/filter` - Also supports includeContributors

```typescript
interface MilestoneWithContributors {
  // ... existing fields ...
  keyFigures?: Array<{
    keyFigure: {
      id: string;
      canonicalName: string;
      shortBio: string;
      role: string;
      imageUrl?: string;
    };
    contributionType: string;
  }>;
}
```

### 47.17 Add Key Figures Endpoint for Public
- [x] `GET /api/key-figures` works for public (published only) - Already implemented in Sprint 45
- [x] Filter: only status='published' for public requests
- [x] Admin requests return all statuses

---

## Phase 7: Search Integration

**COMPLETED** - Global search implemented with Cmd/Ctrl+K shortcut.

### 47.18 Add Figures to Global Search
- [x] Create unified search API (`GET /api/search?q=query`)
- [x] Search milestones, glossary terms, and key figures in parallel
- [x] Search canonical name + aliases for key figures
- [x] Return results grouped by type with counts
- [x] Link to appropriate detail page/modal from results

### 47.19 Add Global Search UI
- [x] Create GlobalSearch command palette component
- [x] Add Cmd/Ctrl+K keyboard shortcut
- [x] Add search button to header (desktop and mobile)
- [x] Arrow key navigation in results
- [x] Category badges and icons per result type
- [x] Click result navigates to detail view

---

## Phase 8: Polish & Performance

### 47.20 Add Image Placeholders
- [x] Generate initials-based placeholder for figures without images
- [x] Use consistent background color per role
- [x] Researcher: Blue, Executive: Purple, Founder: Green, etc.
Note: Implemented in KeyFigureCard, KeyFigureModal, ContributorHoverCard

### 47.21 Optimize Queries
- [x] Index on KeyFigure.canonicalName already exists in schema
- [x] Eager load contributors in milestone detail (includeContributors param)
- [ ] Cache key figures list (SWR/React Query) - optional optimization

### 47.22 Add Loading States
- [x] Skeleton cards while loading figures (KeyFiguresList, KeyFigureModal)
- [x] Loading spinner in modal (implemented)
- [x] Graceful error handling (implemented)

---

## Phase 9: Testing & Deployment

### 47.23 Test Glossary Display
- [ ] Key Figures tab shows all published figures
- [ ] Role filter works correctly
- [ ] Search by name works
- [ ] Card click opens modal

### 47.24 Test Milestone Integration
- [ ] Milestone detail shows contributors
- [ ] Hover card displays correctly
- [ ] Modal opens from hover card
- [ ] Contributor filter on timeline works

### 47.25 Test Migration
- [ ] Migration processes all milestones with contributors
- [ ] Existing figures matched correctly
- [ ] New figures created as drafts
- [ ] No duplicate figures created
- [ ] MilestoneContributor links created

### 47.26 Test Search
- [ ] Global search returns figures
- [ ] Autocomplete works in admin
- [ ] Alias search returns correct figure

### 47.27 Deploy
- [ ] Run migration script in production (POST /api/admin/migrations/contributors)
- [x] Deploy backend updates
- [x] Deploy frontend
- [x] CloudFront cache invalidated
- [ ] Review and publish migrated figures (admin workflow)
- [ ] Verify public display

---

## Component Hierarchy

```
GlossaryPage
├── TabNavigation [Terms | Key Figures]
├── GlossaryTermsList (existing)
└── KeyFiguresList (new)
    ├── RoleFilter
    ├── SearchInput
    └── KeyFigureCard[] → onClick → KeyFigureModal

MilestoneDetailPage
├── ... existing content ...
└── ContributorsSection
    └── ContributorChip[]
        ├── onHover → ContributorHoverCard (Portal)
        └── onClick → KeyFigureModal (Portal)

TimelinePage
├── FigureFilter (dropdown)
└── TimelineCard[]
    └── ContributorChips (truncated)
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/GlossaryPage.tsx` | MODIFY | Add Key Figures tab |
| `src/components/glossary/KeyFiguresList.tsx` | CREATE | Figures list with filters |
| `src/components/glossary/KeyFigureCard.tsx` | CREATE | Figure card component |
| `src/components/glossary/KeyFigureModal.tsx` | CREATE | Figure detail modal |
| `src/components/timeline/ContributorChip.tsx` | CREATE | Name chip component |
| `src/components/timeline/ContributorHoverCard.tsx` | CREATE | Hover preview card |
| `src/pages/MilestoneDetailPage.tsx` | MODIFY | Add contributors section |
| `src/components/timeline/TimelineCard.tsx` | MODIFY | Add contributor chips |
| `src/pages/TimelinePage.tsx` | MODIFY | Add figure filter |
| `server/src/controllers/milestones.ts` | MODIFY | Include contributors in response |
| `prisma/migrations/scripts/migrateContributors.ts` | CREATE | Migration script |
| `server/src/controllers/migrations.ts` | MODIFY | Add migration endpoint |

---

## Success Criteria

- [x] Key Figures tab visible in glossary
- [x] All published figures display in alphabetical grid
- [x] Role filter and search work correctly
- [x] Figure modal shows all details and related milestones
- [x] Milestone detail shows linked contributors
- [x] Hover cards display correctly via Portal
- [x] Timeline cards show contributor chips
- [ ] Figure filter on timeline works
- [ ] Migration converts all existing contributors
- [x] Global search includes key figures

---

## Future Enhancements (Post-Sprint)

1. **Figure Timelines**: Visual timeline of figure's contributions
2. **Figure Relationships**: Show collaborations between figures
3. **Organization Pages**: Aggregate figures by company
4. **Contribution Graph**: Network visualization of figures and milestones
5. **Figure Comparison**: Side-by-side comparison of figures
6. **Auto-Image Fetching**: Fetch Wikipedia images automatically
