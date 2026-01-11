# Sprint KPC-3: Cross-Linking Infrastructure

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-11 by Claude - Milestone contributor linking complete

## Overview

Connect Milestones and News Events to real Person/Organization records instead of using legacy string fields. This enables rich cross-referencing throughout the platform.

**Goals:**
1. Admin UI to link Persons to Milestones (MilestoneContributor)
2. Admin UI to link Persons/Orgs to News Events (NewsEventPersonMention, NewsEventOrgMention)
3. Update frontend views to display linked entities with clickable links to profiles
4. Migration script to parse legacy `contributors` strings and create links

**Prerequisites:** Sprint KPC-1 (Schema) and Sprint KPC-2 (Profile Pages) completed

---

## Tasks

### 1. Milestone Contributor Linking (Admin) ✅ COMPLETE

#### 1.1 Update EditMilestonePage
- [x] Add "Contributors" section to `src/pages/admin/EditMilestonePage.tsx`:
  - Search/autocomplete for persons
  - List of current contributors with contribution type badge
  - Remove button for each contributor
  - Add contribution type selector (lead, co_author, advisor, founder, mentioned)

#### 1.2 Create API Endpoints
- [x] `POST /api/milestones/:id/linked-persons` - Add contributor
- [x] `DELETE /api/milestones/:id/linked-persons/:personId` - Remove contributor
- [x] `GET /api/milestones/:id/linked-persons` - List contributors (public)

> **Note:** Renamed from `/contributors` to `/linked-persons` to avoid route conflict with legacy KeyFigure `/contributors` endpoint

#### 1.3 Backend Service
- [x] Add to `server/src/services/milestones.ts`:
  - `addContributor(milestoneId, personId, contributionType)`
  - `removeContributor(milestoneId, personId)`
  - `getContributors(milestoneId)`

#### 1.4 Update Milestone Detail Response
- [x] Include linked contributors via separate API call in MilestoneDetail component

---

### 2. News Event Entity Linking (Admin)

#### 2.1 Update CreateNewsEventPage / Edit Flow
- [ ] Add "Mentioned Entities" section with person/org pickers

#### 2.2 Create API Endpoints
- [ ] `POST /api/admin/news-events/:id/person-mentions` - Add person mention
- [ ] `DELETE /api/admin/news-events/:id/person-mentions/:personId` - Remove
- [ ] `POST /api/admin/news-events/:id/org-mentions` - Add org mention
- [ ] `DELETE /api/admin/news-events/:id/org-mentions/:orgId` - Remove

#### 2.3 Backend Service
- [ ] Add entity mention functions to `server/src/services/currentEvents.ts`

---

### 3. Frontend Display Updates

#### 3.1 Update Milestone Detail Modal/Page ✅ COMPLETE
- [x] Show contributor avatars with links to profiles (PersonContributorChip component)
- [x] Replace legacy `contributors` string with linked persons
- [x] Keep legacy string as fallback (UnlinkedContributorChip for text-only)

#### 3.2 Update Milestone Cards on Timeline
- [ ] Show contributor avatar stack (up to 3)
- [ ] Tooltip showing contributor names

#### 3.3 Update News Page
- [ ] Show mentioned persons/orgs as clickable chips

---

### 4. Person Search API ✅ COMPLETE

#### 4.1 Create Search Endpoint
- [x] `GET /api/persons/search?q=sam` - Search for persons by name
  - Used by admin contributor picker

---

### 5. Migration Script

#### 5.1 Parse Legacy Contributors
- [ ] Create `scripts/migrate-contributors.ts`:
  1. Find milestones with non-empty `contributors` JSON
  2. Parse each contributor name
  3. Fuzzy match against existing Person records
  4. Create MilestoneContributor records for matches
  5. Log unmatched names for manual review

---

## API Summary

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/persons/search?q=` | Search persons by name | ✅ |
| GET | `/api/milestones/:id/linked-persons` | List contributors | ✅ |
| POST | `/api/milestones/:id/linked-persons` | Add contributor | ✅ |
| DELETE | `/api/milestones/:id/linked-persons/:personId` | Remove contributor | ✅ |
| POST | `/api/admin/news-events/:id/person-mentions` | Add person mention | ⬜ |
| DELETE | `/api/admin/news-events/:id/person-mentions/:personId` | Remove | ⬜ |
| POST | `/api/admin/news-events/:id/org-mentions` | Add org mention | ⬜ |
| DELETE | `/api/admin/news-events/:id/org-mentions/:orgId` | Remove | ⬜ |

---

## Acceptance Criteria

- [x] Admin can search and add persons as milestone contributors
- [x] Admin can remove contributors from milestones
- [x] Milestone detail shows linked contributors with profile links
- [ ] Timeline cards show contributor avatars
- [ ] Migration script creates links from legacy data

---

## Completed Work Summary (2026-01-11)

### Files Created
- `src/components/Timeline/PersonContributorChip.tsx` - Chip component for linked persons

### Files Modified
- `server/src/services/milestones.ts` - Added contributor CRUD functions
- `server/src/routes/milestones.ts` - Added `/linked-persons` endpoints
- `server/src/controllers/milestones.ts` - Added controller methods
- `src/pages/admin/EditMilestonePage.tsx` - Added contributor management UI
- `src/components/Timeline/MilestoneDetail.tsx` - Added PersonContributorChip display
- `src/services/api.ts` - Added milestonesApi.getContributors/addContributor/removeContributor

### Bug Fixes
- Fixed Prisma orderBy error (MilestoneContributor has no createdAt field)
- Fixed route conflict between KeyFigure `/contributors` and Person `/linked-persons`
- Fixed PersonContributorChip link path (`/people/:slug` not `/persons/:slug`)

---

## Notes for Future Developers

### Contribution Types
- `lead` - Primary contributor / lead author
- `co_author` - Co-author or co-creator
- `advisor` - Advisory role
- `founder` - Founding team member
- `mentioned` - Named in relation to the milestone

### Mention Types (News Events)
**Person:** subject, quoted, mentioned
**Org:** subject, announcement, mentioned
