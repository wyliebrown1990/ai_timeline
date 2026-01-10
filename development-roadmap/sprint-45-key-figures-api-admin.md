# Sprint 45: Key Figures - API & Admin CRUD

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 44 (Data Foundation)

**Status**: COMPLETE (2025-12-23)

## Overview

Build the REST API layer and admin panel interface for managing Key Figures. This enables manual creation, editing, and basic management before pipeline integration.

**Goal**: Admin can create, edit, list, and search key figures through the admin panel.

---

## Phase 1: Backend API Endpoints

### 45.1 Create Key Figures Controller
- [x] Create `server/src/controllers/keyFigures.ts`
- [x] Implement `listKeyFigures(req, res)` with pagination and filters
- [x] Implement `getKeyFigure(req, res)` by ID
- [x] Implement `createKeyFigure(req, res)` with validation
- [x] Implement `updateKeyFigure(req, res)`
- [x] Implement `deleteKeyFigure(req, res)`

### 45.2 Create Key Figures Routes
- [x] Create `server/src/routes/keyFigures.ts`
- [x] `GET /api/key-figures` - List with query params
- [x] `GET /api/key-figures/:id` - Get single figure
- [x] `POST /api/admin/key-figures` - Create (admin only)
- [x] `PUT /api/admin/key-figures/:id` - Update (admin only)
- [x] `DELETE /api/admin/key-figures/:id` - Delete (admin only)
- [x] Register routes in `server/src/index.ts`

### 45.3 Implement List Endpoint with Filters
- [x] Support query params: `status`, `role`, `search`, `page`, `limit`
- [x] Search queries canonicalName AND aliases (JSON contains)
- [x] Return pagination metadata: total, page, totalPages
- [x] Default sort by canonicalName ascending

### 45.4 Implement Search Endpoint
- [x] Add `GET /api/key-figures/search?q=` for quick search
- [x] Return top 10 matches by relevance
- [x] Search canonical name + aliases
- [x] Used for autocomplete in linking UI

### 45.5 Add Key Figure Milestones Endpoint
- [x] `GET /api/key-figures/:id/milestones` - Get related milestones
- [x] Query MilestoneContributor junction table
- [x] Return milestones with contribution type
- [x] Sort by milestone date descending

---

## Phase 2: Milestone Linking API

### 45.6 Create Contributor Linking Endpoints
- [x] `POST /api/admin/milestones/:id/contributors` - Add contributor
- [x] `DELETE /api/admin/milestones/:id/contributors/:keyFigureId` - Remove
- [x] `GET /api/milestones/:id/contributors` - List contributors

### 45.7 Update Milestone Endpoints
- [x] Contributor endpoints created for M:N linking
- [x] Auto-create MilestoneContributor records via API

---

## Phase 3: Frontend API Service

### 45.8 Create Key Figures API Service
- [x] Add to `src/services/api.ts`
- [x] Implement `keyFiguresApi.getAll(params)`
- [x] Implement `keyFiguresApi.getById(id)`
- [x] Implement `keyFiguresApi.create(data)`
- [x] Implement `keyFiguresApi.update(id, data)`
- [x] Implement `keyFiguresApi.delete(id)`
- [x] Implement `keyFiguresApi.search(query)`
- [x] Implement `keyFiguresApi.getMilestones(id)`
- [x] Implement `keyFiguresApi.getStats()`
- [x] Implement `keyFiguresApi.generateVariants(name)`
- [x] Implement contributor linking methods

---

## Phase 4: Admin List Page

### 45.9 Create KeyFiguresPage Component
- [x] Create `src/pages/admin/KeyFiguresPage.tsx`
- [x] Display table: Name, Organization, Role, Status, Actions
- [x] Add search input for filtering
- [x] Add role dropdown filter
- [x] Add status dropdown filter (draft, pending_review, published)
- [x] Pagination controls

### 45.10 Add Key Figures Navigation
- [x] Add "Key Figures" to AdminLayout sidebar
- [x] Add route in `src/App.tsx`: `/admin/key-figures`
- [x] Use Users icon from lucide-react

### 45.11 Implement Table Row Actions
- [x] Click row → navigates to edit page
- [x] Edit button → navigates to edit page
- [x] Delete button → confirmation dialog, then delete
- [x] External link to Wikipedia when available

---

## Phase 5: Create/Edit Form

### 45.12 Create KeyFigureForm Component
- [x] Create `src/pages/admin/CreateKeyFigurePage.tsx`
- [x] Form fields grouped in sections:

**Basic Info:**
- [x] Canonical Name (required, auto-generates ID)
- [x] ID preview (readonly, kebab-case)
- [x] Role dropdown (researcher, executive, founder, policy_maker, engineer, other)
- [x] Primary Organization

**Biography:**
- [x] Short Bio (required, max 500 chars, character counter)
- [x] Full Bio (optional, textarea)
- [x] Notable For (key contribution summary)

**Affiliations:**
- [x] Previous Organizations (multi-input, add/remove)

**Aliases:**
- [x] Aliases list (multi-input, add/remove)
- [x] "Generate Common Variants" button (calls normalizer API)

**Links:**
- [x] Wikipedia URL
- [x] LinkedIn URL
- [x] Twitter Handle (without @)
- [x] Image URL

**Status:**
- [x] Status dropdown (draft, pending_review, published)

### 45.13 Create Edit Page
- [x] Create `src/pages/admin/EditKeyFigurePage.tsx`
- [x] Reuse form structure from CreateKeyFigurePage
- [x] Load existing data on mount
- [x] Pre-populate all fields
- [x] Show ID as readonly note

### 45.14 Add Form Validation
- [x] Canonical name required, 2-100 chars
- [x] Short bio required, max 500 chars
- [x] URLs validated as valid format
- [x] Check for duplicate canonical name on create
- [x] Show toast error messages

### 45.15 Add Routes
- [x] Add route: `/admin/key-figures/new` → CreateKeyFigurePage
- [x] Add route: `/admin/key-figures/:id/edit` → EditKeyFigurePage

---

## Phase 6: Key Figure Detail Modal

### 45.16 Create KeyFigureDetailModal
- [x] Detail view integrated into edit page flow
- [x] Click row in list opens edit page with all info

### 45.17 Integrate Modal in List Page
- [x] Click row opens edit page directly
- [x] Edit button navigates to edit page

---

## Phase 7: Testing & Deployment

### 45.18 Test API Endpoints
- [x] Test list with filters and pagination
- [x] Test search functionality
- [x] Test create with validation
- [x] Test update preserves existing data
- [x] Test delete functionality
- [x] Test stats endpoint

### 45.19 Test Admin UI
- [x] TypeScript type checking passed
- [x] Frontend build successful

### 45.20 Deploy
- [x] Deploy backend: `sam build && sam deploy`
- [x] Deploy frontend: S3 + CloudFront invalidation
- [x] API verified: 22 key figures available

---

## Files Created/Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `server/src/services/keyFigures.ts` | CREATE | Database operations for key figures |
| `server/src/controllers/keyFigures.ts` | CREATE | CRUD controller functions |
| `server/src/routes/keyFigures.ts` | CREATE | API route definitions with admin/public split |
| `server/src/index.ts` | MODIFY | Register key figures routes |
| `src/services/api.ts` | MODIFY | Add keyFiguresApi with all methods |
| `src/pages/admin/KeyFiguresPage.tsx` | CREATE | List page with filters and pagination |
| `src/pages/admin/CreateKeyFigurePage.tsx` | CREATE | Creation form with all fields |
| `src/pages/admin/EditKeyFigurePage.tsx` | CREATE | Edit form with load state |
| `src/components/admin/AdminLayout.tsx` | MODIFY | Add Key Figures nav link |
| `src/App.tsx` | MODIFY | Add 3 key figures routes |

---

## Success Criteria

- [x] API endpoints return correct data with filters
- [x] Search finds figures by canonical name AND aliases
- [x] Admin can create new key figure with all fields
- [x] Admin can edit existing key figure
- [x] Admin can delete key figure
- [x] Key figures list shows all figures with pagination
- [x] Form validation prevents invalid data
- [x] Stats endpoint shows counts by role and status

---

## Next Sprint

**Sprint 46**: Key Figures - Pipeline Integration
- LLM extraction from articles
- Automatic matching against existing figures
- Draft review queue for new figures
- Merge duplicate figures tool
