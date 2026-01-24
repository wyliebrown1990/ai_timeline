# Sprint TD-5: UX & Search Intent Matching

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-23 by Claude

## Overview

Optimize the timeline user experience to match search intent. Users searching for "ai timeline" expect:
- Visual, interactive timeline
- Easy navigation (jump to year, filter by category)
- Search/filter functionality
- Mobile-friendly experience
- Quick answers above the fold

**Priority**: MEDIUM
**Estimated Effort**: 2 days
**Status**: NOT STARTED

## Tasks

### 1. Jump-to-Year Navigation

**File**: `src/pages/TimelinePage.tsx` or new component

#### Year Navigation Bar
- [ ] Add horizontal scrollable year bar at top of timeline:
  ```
  [1950s] [1960s] [1970s] [1980s] [1990s] [2000s] [2010s] [2020s]
  ```
- [ ] Clicking a decade scrolls to that section
- [ ] Highlight current visible decade
- [ ] Sticky position while scrolling
- [ ] Mobile: horizontal scroll with touch support

#### Direct Year Input
- [ ] Add "Jump to year" input field
- [ ] Accept 4-digit year (e.g., 2023)
- [ ] Smooth scroll to first milestone of that year
- [ ] Show error if no milestones in that year

#### URL State Sync
- [ ] Update URL when navigating: `/timeline?year=2023`
- [ ] Support direct linking to years
- [ ] Back button works correctly

### 2. Category Filter Bar

**File**: `src/components/Timeline/TimelineFilters.tsx`

#### Filter UI Above Fold
- [ ] Add category filter buttons prominently at top:
  ```
  All | Models | Research | Products | Policy | Companies
  ```
- [ ] Support multiple category selection
- [ ] Show milestone count per category
- [ ] Clear visual indication of active filters

#### Organization Quick Filters
- [ ] Add "Quick filter by company" dropdown:
  ```
  [OpenAI] [Anthropic] [Google] [Meta] [Microsoft]
  ```
- [ ] Click to filter timeline by organization
- [ ] Combine with category filters

#### URL State for Filters
- [ ] Sync filters to URL: `/timeline?category=MODEL_RELEASE&org=openai`
- [ ] Support shareable filtered views
- [ ] Preserve filters on page refresh

### 3. Timeline Search

**File**: `src/components/Timeline/TimelineSearch.tsx`

#### Search Bar
- [ ] Add search input prominently at top of timeline
- [ ] Placeholder: "Search milestones (e.g., GPT-4, Transformer)"
- [ ] Real-time filtering as user types
- [ ] Debounce input (300ms)

#### Search Features
- [ ] Search milestone titles
- [ ] Search milestone descriptions
- [ ] Highlight matching text in results
- [ ] Show "X results for 'query'" count
- [ ] Keyboard shortcut: `/` to focus search

#### Empty State
- [ ] Show helpful message when no results
- [ ] Suggest related searches or popular milestones
- [ ] Link to browse by category

### 4. Mobile Timeline Optimization

**File**: Various timeline components

#### Mobile-First Layout
- [ ] Test timeline on mobile (320px, 375px, 414px widths)
- [ ] Ensure touch targets are 44px minimum
- [ ] Optimize font sizes for readability
- [ ] Reduce horizontal padding on mobile

#### Mobile Navigation
- [ ] Sticky filter bar on mobile
- [ ] Bottom sheet for detailed filters
- [ ] Swipe gestures for navigation (if applicable)
- [ ] FAB button for "Back to top"

#### Mobile Performance
- [ ] Virtualize long milestone lists
- [ ] Lazy load images below fold
- [ ] Reduce initial JavaScript bundle
- [ ] Target < 3 second load time on 3G

### 5. Above-the-Fold Content

#### Quick Stats Section
- [ ] Add stats bar at top of timeline:
  ```
  📊 250+ Milestones | 🏢 50+ Organizations | 👤 100+ Key Figures | 📅 1950-2026
  ```
- [ ] Clickable to explore each category
- [ ] Establishes authority immediately

#### Featured/Recent Section
- [ ] Show "Recent Additions" (last 5 milestones) at top
- [ ] Or "Featured Milestones" editor picks
- [ ] Quick access to most relevant content

#### Clear Value Proposition
- [ ] Add brief intro paragraph:
  ```
  The most comprehensive interactive AI timeline, from the Dartmouth
  Conference (1956) to today's frontier models. Updated weekly.
  ```
- [ ] Keep above fold on desktop
- [ ] Immediately answers "what is this page"

### 6. Timeline View Options

#### View Mode Toggle
- [ ] Add view options:
  - **Timeline View**: Current chronological layout
  - **Grid View**: Card grid for browsing
  - **List View**: Compact list for scanning
- [ ] Persist preference in localStorage
- [ ] Quick toggle button in toolbar

#### Density Controls
- [ ] Option to show: All milestones / Major only (significance 3-4)
- [ ] Toggle to show/hide descriptions
- [ ] Compact vs expanded milestone cards

### 7. Related Content Suggestions

#### Contextual Links
- [ ] After viewing milestone, show:
  ```
  Related:
  - [Previous milestone in this category]
  - [Next milestone from same org]
  - [Related glossary term]
  ```
- [ ] Increase time on site
- [ ] Improve internal linking

#### "You might also like"
- [ ] Based on viewing patterns
- [ ] Popular milestones in same category
- [ ] Recently added milestones

### 8. Page Speed Optimization

#### Core Web Vitals
- [ ] Measure current LCP, FID, CLS
- [ ] Target: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Optimize images (WebP, lazy loading)
- [ ] Minimize layout shifts

#### Performance Audit
- [ ] Run Lighthouse audit
- [ ] Address all "Opportunities"
- [ ] Implement resource hints (preconnect, preload)
- [ ] Consider CDN for static assets

## Browser Testing & Validation (REQUIRED)

### Navigation Testing
- [ ] Test year navigation jumps correctly
- [ ] Test category filters work
- [ ] Test search returns relevant results
- [ ] Verify URL state syncs properly

### Mobile Testing
- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Verify touch interactions work
- [ ] Check no horizontal scroll

### Performance Testing
- [ ] Run Lighthouse mobile audit
- [ ] Verify LCP < 2.5 seconds
- [ ] Test on slow 3G network
- [ ] Check memory usage on long lists

### Cross-Browser
- [ ] Test Chrome, Firefox, Safari, Edge
- [ ] Verify filters work in all browsers
- [ ] Check search functionality

## Acceptance Criteria

- [ ] Jump-to-year navigation working
- [ ] Category filter bar visible above fold
- [ ] Search functionality working with highlighting
- [ ] Mobile experience optimized (< 3s load)
- [ ] View options available (timeline/grid/list)
- [ ] Core Web Vitals passing
- [ ] URL state reflects filters/navigation

## Notes for Future Developers

### State Management
- Use URL as source of truth for filters
- React Router `useSearchParams` for URL state
- Debounce filter changes to avoid excessive re-renders

### Virtualization
- Use `react-virtual` or `react-window` for long lists
- Virtualize when > 100 items visible
- Maintain scroll position on filter change

### Mobile-First
- Design mobile UI first, then enhance for desktop
- Test on real devices, not just responsive mode
- Consider touch gestures native feel

### Performance Tips
- Lazy load below-fold content
- Use `loading="lazy"` on images
- Code-split heavy components
- Cache API responses

## Deployment

```bash
# Build and test locally first
npm run dev
# Test all features locally

# Production build
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Run Lighthouse on production
# Fix any regressions
```
