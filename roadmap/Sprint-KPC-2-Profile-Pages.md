# Sprint KPC-2: Profile Pages

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-11 by Claude - Profile pages tested and verified working

## Overview

Create dedicated profile pages for Persons and Organizations. These are full-page experiences (not modals) with comprehensive information, structured sections, and related content.

**Goals:**
1. Person profile page with all biography sections
2. Organization profile page with mission, history, and people
3. Shared components for cards and previews
4. Responsive design for mobile and desktop

**Prerequisites:** Sprint KPC-1 (Schema & Migration) completed

---

## Tasks

### 1. Person Profile Page

#### 1.1 Create Route
- [x] Add route in `src/App.tsx` or router config:
  ```tsx
  <Route path="/people/:slug" element={<PersonProfilePage />} />
  ```

#### 1.2 Create PersonProfilePage Component
- [x] Create `src/pages/PersonProfilePage.tsx`:

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to People                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐  Name                                             │
│  │ Photo│  Role Badge    Current Org                        │
│  └──────┘  External Links (Twitter, LinkedIn, etc.)         │
├─────────────────────────────────────────────────────────────┤
│  CURRENTLY DOING (auto-updated)                             │
│  What they're working on now...                             │
│  Last updated: Jan 2026                                     │
├─────────────────────────────────────────────────────────────┤
│  ABOUT                                                      │
│  Short bio...                                               │
├─────────────────────────────────────────────────────────────┤
│  BACKGROUND                                                 │
│  Education and early career...                              │
├─────────────────────────────────────────────────────────────┤
│  MAJOR CONTRIBUTIONS                                        │
│  Key innovations and impact...                              │
├─────────────────────────────────────────────────────────────┤
│  PHILOSOPHY & APPROACH                                      │
│  Their perspective on AI...                                 │
├─────────────────────────────────────────────────────────────┤
│  CAREER HISTORY                 │  RELATED MILESTONES       │
│  ┌─ OpenAI (2019-present)      │  ┌─ GPT-4 (2023)          │
│  │  Chief Scientist            │  │  Lead contributor       │
│  ├─ Google (2015-2019)         │  ├─ ChatGPT (2022)        │
│  │  Research Scientist         │  │  Team member            │
│  └─ Stanford (2010-2015)       │  └─ Transformer (2017)    │
│     PhD Candidate              │     Co-author              │
├─────────────────────────────────────────────────────────────┤
│  RECENT NEWS                                                │
│  ┌─ "Person joins new company" - Jan 2026                  │
│  ├─ "Person speaks at conference" - Dec 2025               │
│  └─ "Person publishes paper" - Nov 2025                    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [x] Fetch person data by slug: `GET /api/persons/:slug`
- [x] Fetch affiliations: included in slug response
- [x] Fetch milestones: included in slug response
- [x] Fetch news mentions: included in slug response
- [x] Handle loading state with skeleton
- [x] Handle 404 for unknown slugs
- [x] Add document title for SEO
- [ ] Add meta tags for SEO (og:image, description)

#### 1.3 Person Profile Sections

- [x] **Header Section** (inline in PersonProfilePage.tsx):
  - Avatar (image or initials fallback)
  - Name (h1)
  - Role badge (color-coded by role type)
  - Current organization (linked to org page)
  - Aliases (if any)
  - External links row (Wikipedia, LinkedIn, Twitter, Scholar, Website)

- [x] **Currently Doing Section** (inline):
  - Highlighted card with distinct styling
  - Auto-update indicator with timestamp
  - Empty state if no current activity

- [x] **Biography Sections** (collapsible via ProfileSection component):
  - About (shortBio) - always visible
  - Background (education, early life)
  - Major Contributions
  - Philosophy & Approach

- [x] **Career History Section** (CareerTimeline component inline):
  - Vertical timeline of affiliations
  - Organization name (linked)
  - Role title
  - Date range
  - Current position highlighted
  - Notes if available

- [x] **Related Milestones Section**:
  - List of milestones they contributed to
  - Contribution type badge
  - Click to navigate to timeline with milestone highlighted
  - "View all on timeline" link

- [x] **Recent News Section**:
  - Latest news events mentioning this person
  - Mention type indicator
  - "See all news" link

---

### 2. Organization Profile Page

#### 2.1 Create Route
- [x] Add route:
  ```tsx
  <Route path="/organizations/:slug" element={<OrganizationProfilePage />} />
  ```
- [ ] Add alias route:
  ```tsx
  <Route path="/companies/:slug" element={<Navigate to="/organizations/:slug" />} />
  ```

#### 2.2 Create OrganizationProfilePage Component
- [x] Create `src/pages/OrganizationProfilePage.tsx`:

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Organizations                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐  Name                                             │
│  │ Logo │  Type Badge (Company / University / Lab)          │
│  └──────┘  Founded: 2015 | HQ: San Francisco                │
│            Website | Wikipedia | LinkedIn                   │
├─────────────────────────────────────────────────────────────┤
│  CURRENT FOCUS (auto-updated)                               │
│  What they're working on now...                             │
│  Last updated: Jan 2026                                     │
├─────────────────────────────────────────────────────────────┤
│  ABOUT                                                      │
│  Short description...                                       │
├─────────────────────────────────────────────────────────────┤
│  MISSION                                                    │
│  Mission statement...                                       │
├─────────────────────────────────────────────────────────────┤
│  HISTORY                                                    │
│  Founding story and evolution...                            │
├─────────────────────────────────────────────────────────────┤
│  KEY PRODUCTS & RESEARCH                                    │
│  ┌─ ChatGPT ─┐ ┌─ GPT-4 ─┐ ┌─ DALL-E ─┐                    │
│  └───────────┘ └─────────┘ └──────────┘                    │
├─────────────────────────────────────────────────────────────┤
│  KEY PEOPLE                     │  MILESTONES               │
│  ┌─ Sam Altman (CEO)           │  ┌─ GPT-4 (2023)          │
│  ├─ Mira Murati (CTO)          │  ├─ ChatGPT (2022)        │
│  ├─ Greg Brockman (President)  │  └─ GPT-3 (2020)          │
│  └─ + 5 more                   │                           │
├─────────────────────────────────────────────────────────────┤
│  RECENT NEWS                                                │
│  ┌─ "OpenAI announces..." - Jan 2026                       │
│  ├─ "OpenAI partners with..." - Dec 2025                   │
│  └─ "OpenAI releases..." - Nov 2025                        │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [x] Fetch organization data: `GET /api/organizations/:slug`
- [x] Fetch current employees: included in slug response
- [x] Fetch milestones: included in slug response
- [x] Fetch news mentions: included in slug response (optional)
- [x] Handle loading and error states

#### 2.3 Organization Profile Sections

- [x] **Header Section** (inline in OrganizationProfilePage.tsx):
  - Logo (or letter fallback)
  - Name (h1)
  - Type badge (Company, Research Lab, University, etc.)
  - Founded year and headquarters
  - External links row

- [x] **Current Focus Section**:
  - Similar to Person's "Currently Doing"
  - Highlighted styling with timestamp

- [x] **Content Sections**:
  - About (shortDescription)
  - Mission
  - History
  - Focus Areas (tag chips)

- [x] **Products & Research Section**:
  - Grid of product/project cards

- [x] **Key People Section** (PersonCard component inline):
  - Grid of person cards (current employees)
  - Show role and photo
  - Link to person profile
  - "View all" if > 6 people

- [x] **Milestones Section**:
  - List of org's milestones
  - Link to full timeline filtered by org

- [x] **Recent News Section**:
  - Same pattern as Person profile

---

### 3. Shared Components

Note: Components created inline in page files for initial implementation. Can be extracted later if reuse is needed.

#### 3.1 Person Card Component
- [x] PersonCard created inline in OrganizationProfilePage.tsx:
  - Compact card for grids and lists
  - Photo, name, role badge
  - Click to navigate to profile

#### 3.2 Organization Card Component
- [ ] Create `src/components/Organizations/OrgCard.tsx` (deferred):
  - Can extract from PersonProfilePage if needed

#### 3.3 Affiliation Timeline Component
- [x] CareerTimeline created inline in PersonProfilePage.tsx:
  - Vertical timeline visualization

#### 3.4 Section Component
- [x] ProfileSection created inline in both pages:
  - Consistent section styling
  - Title, optional icon, content
  - Collapsible option

#### 3.5 External Links Row
- [x] ExternalLinksRow created inline in both pages:
  - Row of icon buttons
  - Configurable links
  - Opens in new tab

---

### 4. Update Existing Components

#### 4.1 Update KeyFigureModal
- [ ] Add "View Full Profile" button linking to `/people/:slug`
- [ ] Update to use new Person type
- [ ] Keep modal for quick preview, profile for deep dive

#### 4.2 Update KeyFigureCard
- [ ] Rename to PersonCard or create wrapper
- [ ] Update styling to match new design
- [ ] Add link to profile page

#### 4.3 Update Milestone Detail
- [ ] Make contributor names clickable → link to person profile
- [ ] Make organization clickable → link to org profile

---

### 5. API Updates

#### 5.1 Add Slug-based Endpoints
- [x] `GET /api/persons/:slug` - get person by slug (Sprint KPC-1)
- [x] `GET /api/persons/:slug/affiliations` - career history (Sprint KPC-1)
- [x] `GET /api/persons/:slug/milestones` - related milestones (included in :slug response)
- [x] `GET /api/persons/:slug/news` - news mentions (included in :slug response)
- [x] `GET /api/organizations/:slug` - get org by slug (Sprint KPC-1)
- [x] `GET /api/organizations/:slug/persons` - people at org (included in :slug response)
- [x] `GET /api/organizations/:slug/milestones` - org milestones (included in :slug response)
- [ ] `GET /api/organizations/:slug/news` - news mentions (to be added)

#### 5.2 Update DTOs
- [x] PersonDetailDto - include affiliations, milestone count, news count (Sprint KPC-1)
- [x] OrganizationDetailDto - include people count, milestone count (Sprint KPC-1)

---

### 6. Navigation & Routing

- [ ] Add breadcrumbs to profile pages
- [ ] Add "Back to People/Organizations" links
- [ ] Update any existing links to KeyFigure modal to offer profile option
- [ ] Ensure deep linking works (share person/org URL)

---

### 7. Responsive Design

- [ ] Mobile layout: stack sections vertically
- [ ] Collapsible sections on mobile
- [ ] Touch-friendly tap targets
- [ ] Image optimization for mobile

---

### 8. SEO & Meta Tags

- [ ] Add page titles: "{Name} - AI Timeline" / "{Org} - AI Timeline"
- [ ] Add meta descriptions from shortBio/shortDescription
- [ ] Add Open Graph tags for social sharing
- [ ] Add structured data (JSON-LD) for persons and organizations

---

## Acceptance Criteria

- [ ] Person profile page displays all biography sections
- [ ] Organization profile page displays mission, history, people
- [ ] Career timeline shows affiliations in chronological order
- [ ] Related milestones are clickable and navigate to timeline
- [ ] Recent news section shows relevant news events
- [ ] External links open in new tabs
- [ ] Pages are responsive on mobile
- [ ] Loading states show skeletons
- [ ] 404 handling for unknown slugs
- [ ] Modal "View Full Profile" links work

---

## Testing Checklist

- [x] Navigate to person profile via URL
- [ ] Navigate to person profile via card click
- [x] Navigate to org profile via URL
- [x] Verify all sections render with data
- [x] Verify empty states for missing data
- [ ] Test mobile layout
- [x] Test external links
- [ ] Test milestone/news links navigate correctly
- [x] Verify person → org links work bidirectionally

---

## Validation with Claude Chrome

Before marking complete:
- [x] Take screenshot of person profile page (desktop)
- [ ] Take screenshot of person profile page (mobile)
- [x] Take screenshot of organization profile page
- [x] Verify no console errors on profile pages
- [x] Test navigation flow: Home → People → Person → Org → Back

### Bug Fix Applied (2026-01-11)
Fixed API error in `server/src/services/persons.ts`:
- `NewsEventPersonMention.event` uses `headline` not `title`
- `NewsEventPersonMention.event` uses `publishedDate` not `date`
- Redeployed Lambda with fix

---

## Notes for Future Developers

### Design Decisions
- Profile pages use a single-column layout for readability
- Sections are collapsible on mobile to reduce scrolling
- "Currently Doing" is prominently featured to show freshness
- Career timeline uses vertical layout (not horizontal) for mobile

### Empty States
Handle gracefully when sections have no data:
- Background: "Background information not yet available"
- Philosophy: Hide section entirely
- Affiliations: "No career history recorded"
- Milestones: "No linked milestones yet"
- News: "No recent news mentions"

### Image Handling
- Person photos: 200x200 minimum, square aspect ratio
- Org logos: variable aspect ratio, max 200px height
- Use initials/letter fallback for missing images
- Lazy load images below the fold
