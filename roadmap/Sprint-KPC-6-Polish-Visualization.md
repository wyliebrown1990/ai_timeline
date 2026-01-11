# Sprint KPC-6: Polish & Visualization

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Final polish sprint focused on visual enhancements, career timeline visualization, relationship graphs, and overall refinement of the People & Companies feature.

**Goals:**
1. Interactive career timeline visualization for persons
2. Organization relationship/ecosystem visualization
3. Person collaboration network (optional)
4. UI polish and consistency
5. Performance optimization
6. Cleanup deprecated fields and code

**Prerequisites:** Sprint KPC-1 through KPC-5 completed

---

## Tasks

### 1. Career Timeline Visualization

#### 1.1 Create Interactive Career Timeline

- [ ] Create `src/components/People/CareerTimelineViz.tsx`:

**Visual Design:**
```
2010        2015        2020        2025
  │           │           │           │
  ├───────────┼───────────┼───────────┤
  │           │           │           │
  │  ┌────────┴────────┐  │           │
  │  │   Stanford      │  │           │
  │  │   PhD Student   │  │           │
  │  └────────┬────────┘  │           │
  │           │           │           │
  │           │  ┌────────┴────────┐  │
  │           │  │    Google       │  │
  │           │  │    Research     │  │
  │           │  └────────┬────────┘  │
  │           │           │           │
  │           │           │  ┌────────┴──────── ▶
  │           │           │  │    OpenAI
  │           │           │  │    Chief Scientist
  │           │           │  └──────────────────
```

**Implementation:**
- [ ] Horizontal timeline axis with year markers
- [ ] Colored bars for each affiliation period
- [ ] Organization logo at start of bar
- [ ] Role text within or below bar
- [ ] Current position extends to "now" indicator
- [ ] Hover for details (exact dates, notes)
- [ ] Click bar to navigate to org profile
- [ ] Responsive: stack vertically on mobile

#### 1.2 Integrate into Person Profile

- [ ] Add CareerTimelineViz to PersonProfilePage
- [ ] Replace or complement the list-based CareerTimeline
- [ ] Toggle option: "View as timeline" / "View as list"

---

### 2. Organization Ecosystem Visualization

#### 2.1 Create Org Ecosystem View

- [ ] Create `src/components/Organizations/OrgEcosystem.tsx`:

**Visual Design (optional, if time permits):**
```
                    ┌─────────────┐
                    │   OpenAI    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌─────┴─────┐      ┌─────┴─────┐
   │ Microsoft│       │  Anthropic │      │ Google   │
   │ (Partner)│       │ (Spinoff)  │      │(Competitor)│
   └─────────┘       └───────────┘      └───────────┘
```

**Simpler Alternative: Related Organizations Grid**
- [ ] Show organizations with shared people
- [ ] Show organizations in same focus areas
- [ ] "Companies also working on [LLMs]" section

---

### 3. Person Collaboration Network (Optional)

#### 3.1 Create Collaboration Visualization

- [ ] Create `src/components/People/CollaboratorNetwork.tsx`:
  - Show other people this person has collaborated with
  - Based on shared milestones
  - Simple node graph or grid layout

**Implementation:**
- [ ] Fetch collaborators: people who share milestones
- [ ] Display as grid of PersonCards
- [ ] Or: simple network graph (if using visualization library)

---

### 4. UI Polish & Consistency

#### 4.1 Design System Consistency

- [ ] Audit all Person-related components for consistency:
  - PersonCard styling matches across all uses
  - Role badge colors consistent
  - Avatar/initials fallback consistent

- [ ] Audit all Organization-related components:
  - OrgCard styling consistent
  - Type badge colors consistent
  - Logo/letter fallback consistent

#### 4.2 Loading States

- [ ] Add skeleton loaders for:
  - Person profile page
  - Organization profile page
  - People browse page
  - Organizations browse page
  - Career timeline

#### 4.3 Empty States

- [ ] Design and implement empty states:
  - Person with no affiliations: "Career history not yet documented"
  - Person with no milestones: "No linked milestones yet"
  - Person with no news: "No recent news mentions"
  - Org with no people: "No key people documented yet"
  - Search with no results: helpful suggestions

#### 4.4 Error States

- [ ] Handle and display errors gracefully:
  - Profile not found (404)
  - API errors
  - Network errors

#### 4.5 Animations & Transitions

- [ ] Add subtle animations:
  - Page transitions
  - Card hover effects
  - Filter selection feedback
  - Loading to loaded transition

---

### 5. Performance Optimization

#### 5.1 API Response Optimization

- [ ] Review and optimize API queries:
  - Use `select` to fetch only needed fields
  - Avoid N+1 queries in related data
  - Add pagination where missing

- [ ] Implement response caching:
  - Cache person/org lists (short TTL)
  - Cache individual profiles (medium TTL)
  - Invalidate on updates

#### 5.2 Frontend Performance

- [ ] Lazy load images:
  - Person photos
  - Organization logos
  - Use blur placeholder

- [ ] Code splitting:
  - Lazy load profile pages
  - Lazy load browse pages

- [ ] Virtual scrolling for long lists (if needed)

#### 5.3 Database Indexes

- [ ] Verify all indexes are in place:
  ```sql
  -- Persons
  CREATE INDEX IF NOT EXISTS idx_person_canonical_name ON "Person"("canonicalName");
  CREATE INDEX IF NOT EXISTS idx_person_slug ON "Person"("slug");
  CREATE INDEX IF NOT EXISTS idx_person_role ON "Person"("role");
  CREATE INDEX IF NOT EXISTS idx_person_current_org ON "Person"("currentOrgId");

  -- Organizations
  CREATE INDEX IF NOT EXISTS idx_org_name ON "Organization"("name");
  CREATE INDEX IF NOT EXISTS idx_org_slug ON "Organization"("slug");
  CREATE INDEX IF NOT EXISTS idx_org_type ON "Organization"("type");
  ```

---

### 6. Cleanup & Migration Finalization

#### 6.1 Remove Deprecated Fields

After confirming all data is properly migrated:

- [ ] Remove `Milestone.contributors` string field (replaced by MilestoneContributor)
- [ ] Remove `Milestone.organization` string field (replaced by organizationId)
- [ ] Remove `KeyFigure.primaryOrg` (replaced by currentOrgId + currentRole)
- [ ] Remove `KeyFigure.previousOrgs` (replaced by Affiliation records)

- [ ] Create cleanup migration:
  ```bash
  npx prisma migrate dev --name cleanup_deprecated_fields
  ```

#### 6.2 Rename KeyFigure → Person

If not already done:
- [ ] Rename table in database
- [ ] Update all references in code
- [ ] Update API endpoints
- [ ] Verify no breaking changes

#### 6.3 Remove Compatibility Shims

- [ ] Remove any backwards-compatibility code added during migration
- [ ] Remove deprecated API routes (if any)
- [ ] Update documentation

---

### 7. Documentation & Help

#### 7.1 Admin Documentation

- [ ] Document entity management workflow:
  - How to add a person
  - How to add an organization
  - How to link entities to milestones/news
  - How to approve entity drafts

#### 7.2 User-Facing Help

- [ ] Add tooltips/help text where useful:
  - What "Currently Doing" means
  - How entity linking works
  - What role badges mean

---

### 8. Analytics & Tracking

#### 8.1 Add Analytics Events

- [ ] Track user interactions:
  - Person profile views
  - Organization profile views
  - Search queries for people/orgs
  - Filter usage on browse pages
  - Click-through from milestone to person

---

### 9. Final Testing & QA

#### 9.1 Cross-Browser Testing

- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome

#### 9.2 Accessibility Audit

- [ ] Keyboard navigation works throughout
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on images

#### 9.3 End-to-End User Flows

- [ ] Flow: Find person via search → view profile → click milestone → view on timeline
- [ ] Flow: Browse organizations → filter by type → view org → click person → view person
- [ ] Flow: View news → click mentioned person → view their profile
- [ ] Flow: Admin adds new person → appears in browse → links to milestone

---

## Acceptance Criteria

- [ ] Career timeline visualization displays correctly
- [ ] All UI components have consistent styling
- [ ] Loading states present throughout
- [ ] Empty states are helpful and well-designed
- [ ] Error states handle gracefully
- [ ] Performance is acceptable (page load < 2s)
- [ ] Deprecated fields removed from schema
- [ ] KeyFigure fully renamed to Person
- [ ] All pages work across browsers
- [ ] Accessibility audit passed

---

## Testing Checklist

- [ ] Career timeline renders with real data
- [ ] Career timeline is interactive (hover, click)
- [ ] Career timeline works on mobile
- [ ] Loading skeletons appear correctly
- [ ] Empty states display when data is missing
- [ ] Error pages display for 404s
- [ ] Images lazy load properly
- [ ] Pages load quickly
- [ ] Migration cleanup runs without errors
- [ ] All deprecated fields removed
- [ ] Keyboard navigation works

---

## Validation with Claude Chrome

Before marking complete:
- [ ] Screenshot career timeline visualization
- [ ] Record page load time for profile page
- [ ] Test complete user flow from search to profile
- [ ] Verify no console errors
- [ ] Test on mobile device or emulator

---

## Notes for Future Developers

### Career Timeline Libraries
If using a visualization library:
- Consider: D3.js, Recharts, or custom SVG
- Keep it lightweight - don't add heavy deps for one component
- Consider canvas for better performance if many affiliations

### Future Enhancements
Ideas not included in this sprint:
- Person-to-person relationship tracking (mentor/mentee, collaborators)
- Organization acquisition/merger history
- Interactive org ecosystem graph
- AI-generated person summaries
- Comparison view (Person A vs Person B)

### Deprecation Strategy
When removing fields:
1. Stop writing to field
2. Migrate all reads to new field/relation
3. Verify no code uses old field
4. Remove from schema
5. Run migration
6. Clean up any leftover data

### Performance Baseline
Establish performance targets:
- Profile page load: < 1.5s
- Browse page load: < 2s
- Search results: < 500ms
- API response: < 200ms

### Maintenance Mode
After launch, set up monitoring for:
- Entity count growth
- "Currently Doing" update frequency
- Entity draft queue size
- Search query patterns
