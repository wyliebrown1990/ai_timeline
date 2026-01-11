# Sprint KPC-5: Discovery & Navigation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Create browse and search experiences for discovering AI people and organizations. Update site navigation to prominently feature these new sections.

**Goals:**
1. People browse page with filters and search
2. Organizations browse page with filters and search
3. Update main navigation with People & Organizations
4. Enhanced search with entity results
5. Filter milestones and news by person/org

**Prerequisites:** Sprint KPC-1 through KPC-4 completed

---

## Tasks

### 1. People Browse Page

#### 1.1 Create PeoplePage Component

- [ ] Create `src/pages/PeoplePage.tsx`:

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Leaders & Researchers                                   │
│  Explore the people shaping artificial intelligence         │
├─────────────────────────────────────────────────────────────┤
│  [Search people...]                    [Filters ▼]          │
├─────────────────────────────────────────────────────────────┤
│  Role: [All] [Researchers] [Executives] [Founders] ...      │
│  Focus: [All] [LLMs] [Safety] [Robotics] ...                │
│  Org: [All] [OpenAI] [Google] [Meta] ...                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Person 1 │ │ Person 2 │ │ Person 3 │ │ Person 4 │        │
│  │  Card    │ │  Card    │ │  Card    │ │  Card    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Person 5 │ │ Person 6 │ │ Person 7 │ │ Person 8 │        │
│  │  Card    │ │  Card    │ │  Card    │ │  Card    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│  [Load More] or Pagination                                  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [ ] Search bar with debounced API calls
- [ ] Filter chips for role types
- [ ] Filter chips for focus areas
- [ ] Organization dropdown filter
- [ ] Grid of PersonCard components
- [ ] Pagination or infinite scroll
- [ ] Empty state for no results
- [ ] Loading skeleton

#### 1.2 Create People API Endpoints

- [ ] `GET /api/persons`:
  ```typescript
  // Query params:
  // - q: search query (searches name, aliases)
  // - role: filter by role
  // - focusArea: filter by focus area
  // - orgId: filter by organization
  // - page, limit: pagination
  // - sort: name, recentActivity, milestoneCount

  // Response:
  {
    data: Person[],
    pagination: { page, limit, total, totalPages }
  }
  ```

- [ ] Add search functionality to persons service:
  - Full-text search on canonicalName
  - Search aliases array
  - Filter by role enum
  - Filter by focusAreas JSON array
  - Filter by currentOrgId

#### 1.3 Create PersonCard Component (if not already)

- [ ] Update `src/components/People/PersonCard.tsx`:
  - Square or portrait aspect ratio image
  - Name (truncated if long)
  - Role badge (color-coded)
  - Current organization
  - Short bio (2 lines, truncated)
  - Click to navigate to profile

#### 1.4 Create FilterBar Component

- [ ] Create `src/components/Filters/RoleFilter.tsx`:
  - Horizontal chip list
  - "All" option clears filter
  - Multi-select support

- [ ] Create `src/components/Filters/FocusAreaFilter.tsx`:
  - Dynamic chips from available focus areas
  - Popular areas highlighted

- [ ] Create `src/components/Filters/OrgFilter.tsx`:
  - Searchable dropdown
  - Show org logos

---

### 2. Organizations Browse Page

#### 2.1 Create OrganizationsPage Component

- [ ] Create `src/pages/OrganizationsPage.tsx`:

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Companies & Institutions                                │
│  From startups to research labs shaping the field           │
├─────────────────────────────────────────────────────────────┤
│  [Search organizations...]               [Filters ▼]        │
├─────────────────────────────────────────────────────────────┤
│  Type: [All] [Companies] [Universities] [Labs] [Nonprofits] │
│  Focus: [All] [LLMs] [Safety] [Robotics] ...                │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │  Org 1 Card   │ │  Org 2 Card   │ │  Org 3 Card   │      │
│  │  Logo, Type   │ │  Logo, Type   │ │  Logo, Type   │      │
│  │  Description  │ │  Description  │ │  Description  │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  [Load More] or Pagination                                  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [ ] Search bar
- [ ] Type filter chips (Company, University, Research Lab, etc.)
- [ ] Focus area filter
- [ ] Grid of OrgCard components
- [ ] Pagination

#### 2.2 Create Organizations API Endpoints

- [ ] `GET /api/organizations`:
  ```typescript
  // Query params:
  // - q: search query
  // - type: filter by org type
  // - focusArea: filter by focus area
  // - page, limit: pagination
  // - sort: name, foundedYear, personCount, milestoneCount

  // Response:
  {
    data: Organization[],
    pagination: { page, limit, total, totalPages }
  }
  ```

#### 2.3 Create OrgCard Component (if not already)

- [ ] Create `src/components/Organizations/OrgCard.tsx`:
  - Logo (or letter fallback)
  - Name
  - Type badge (Company, University, etc.)
  - Short description (2-3 lines)
  - Key stats (people count, milestone count)
  - Click to navigate to profile

---

### 3. Update Main Navigation

#### 3.1 Add Navigation Items

- [ ] Update `src/components/Layout/Header.tsx` or navigation component:
  - Add "People" link → `/people`
  - Add "Organizations" link → `/organizations`
  - Consider dropdown: "Explore" → [People, Organizations]

- [ ] Mobile navigation:
  - Add People and Organizations to mobile menu
  - Icons for each section

#### 3.2 Navigation Design Options

**Option A: Top-level links**
```
[Timeline] [Glossary] [News] [People] [Organizations] [Study]
```

**Option B: "Explore" dropdown**
```
[Timeline] [Glossary] [News] [Explore ▼] [Study]
                              ├─ People
                              └─ Organizations
```

**Option C: Combined page**
```
[Timeline] [Glossary] [News] [Key Players] [Study]
                              └─ Tabs: People | Organizations
```

- [ ] Choose and implement navigation approach

---

### 4. Enhanced Search

#### 4.1 Update Global Search

- [ ] Update search functionality to include entities:
  - Search milestones (existing)
  - Search glossary terms (existing)
  - Search persons (new)
  - Search organizations (new)

- [ ] Create unified search endpoint:
  ```typescript
  GET /api/search?q=...

  // Response:
  {
    milestones: [...],
    glossaryTerms: [...],
    persons: [...],
    organizations: [...],
    news: [...]
  }
  ```

#### 4.2 Update Search Results Display

- [ ] Update search results component:
  - Section for each result type
  - "People" section with PersonCards
  - "Organizations" section with OrgCards
  - Click to navigate to respective pages

#### 4.3 Search Suggestions

- [ ] Add autocomplete/suggestions:
  - Show matching persons as user types
  - Show matching organizations
  - Recent searches

---

### 5. Filter Content by Person/Org

#### 5.1 Timeline Filtering

- [ ] Add person filter to Timeline page:
  - Dropdown: "Filter by contributor"
  - Shows milestones where person is contributor
  - URL param: `?person=geoffrey-hinton`

- [ ] Add organization filter to Timeline page:
  - Dropdown: "Filter by organization"
  - Shows milestones by organization
  - URL param: `?org=openai`

- [ ] Update timeline API to support filters:
  ```typescript
  GET /api/milestones?personId=...&orgId=...
  ```

#### 5.2 News Page Filtering

- [ ] Add person filter to News page:
  - Filter news events mentioning person
  - URL param: `?person=sam-altman`

- [ ] Add organization filter to News page:
  - Filter news events mentioning org
  - URL param: `?org=anthropic`

- [ ] Update news API to support filters:
  ```typescript
  GET /api/current-events?personId=...&orgId=...
  ```

---

### 6. Routes Configuration

- [ ] Add routes to `src/App.tsx`:
  ```tsx
  <Route path="/people" element={<PeoplePage />} />
  <Route path="/people/:slug" element={<PersonProfilePage />} />
  <Route path="/organizations" element={<OrganizationsPage />} />
  <Route path="/organizations/:slug" element={<OrganizationProfilePage />} />
  // Aliases
  <Route path="/companies" element={<Navigate to="/organizations" />} />
  <Route path="/companies/:slug" element={<Navigate to="/organizations/:slug" />} />
  ```

---

### 7. Featured/Highlighted Entities

#### 7.1 Featured People Section

- [ ] Add "Featured People" to homepage or People page:
  - Manually curated list of notable figures
  - Or: most recently active (by news mentions)
  - Carousel or grid display

- [ ] Add `isFeatured` flag to Person model (or use separate table)

#### 7.2 Featured Organizations Section

- [ ] Add "Featured Organizations" section:
  - Major AI companies and labs
  - Universities with notable AI programs

---

### 8. Responsive Design

- [ ] People page responsive:
  - 4 columns desktop → 2 columns tablet → 1 column mobile
  - Collapsible filters on mobile

- [ ] Organizations page responsive:
  - 3 columns desktop → 2 tablet → 1 mobile

- [ ] Filter bars:
  - Horizontal scroll on mobile
  - Or: filter modal/drawer

---

### 9. SEO & Meta Tags

- [ ] People page:
  - Title: "AI Leaders & Researchers - AI Timeline"
  - Description: "Explore the researchers, executives, and founders shaping AI"

- [ ] Organizations page:
  - Title: "AI Companies & Institutions - AI Timeline"
  - Description: "From OpenAI to DeepMind, explore organizations driving AI"

- [ ] Add sitemap entries for browse pages

---

## Acceptance Criteria

- [ ] People browse page displays all published persons
- [ ] Can filter people by role, focus area, organization
- [ ] Can search people by name
- [ ] Organizations browse page displays all published orgs
- [ ] Can filter organizations by type, focus area
- [ ] Can search organizations by name
- [ ] Navigation updated with People & Organizations links
- [ ] Global search returns person and organization results
- [ ] Timeline can be filtered by person or organization
- [ ] News page can be filtered by person or organization
- [ ] Pages are responsive on mobile

---

## Testing Checklist

- [ ] Navigate to People page from nav
- [ ] Search for a person by name
- [ ] Filter people by role (e.g., "Researchers")
- [ ] Filter people by organization (e.g., "OpenAI")
- [ ] Click person card → navigates to profile
- [ ] Navigate to Organizations page
- [ ] Filter orgs by type (e.g., "Universities")
- [ ] Search for organization
- [ ] Click org card → navigates to profile
- [ ] Global search returns people and orgs
- [ ] Filter timeline by person
- [ ] Filter news by organization
- [ ] Test mobile navigation
- [ ] Test mobile filter behavior

---

## Validation with Claude Chrome

Before marking complete:
- [ ] Screenshot People page (desktop)
- [ ] Screenshot People page (mobile)
- [ ] Screenshot Organizations page
- [ ] Test search flow end-to-end
- [ ] Test filter combinations
- [ ] Verify no console errors

---

## Notes for Future Developers

### Filter URL Persistence
Filters should be persisted in URL params so users can share filtered views:
- `/people?role=researcher&focusArea=safety`
- `/organizations?type=company`
- `/timeline?person=geoffrey-hinton`

### Sort Options
Consider adding sort options:
- People: Name (A-Z), Recent Activity, Milestone Count
- Organizations: Name, Founded Year, People Count

### Empty States
Design good empty states:
- No results for search: "No people found matching 'xyz'. Try a different search."
- No people in role: "No policy makers yet. Know someone we should add?"

### Performance
- Lazy load images below fold
- Paginate results (20-30 per page)
- Consider virtual scrolling for large lists
- Cache filter options (roles, focus areas)

### Accessibility
- Filter chips should be keyboard navigable
- Search should have proper ARIA labels
- Cards should be focusable and clickable via keyboard
