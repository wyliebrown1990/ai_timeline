# Sprint 3: Timeline UI Foundation

## Sprint Goal
Build the core timeline visualization component with milestone cards and basic layout.

---

## Prerequisites
- [ ] Sprint 2 completed
- [ ] Data layer functional
- [ ] Sample milestones available in database

---

## Tasks

### 3.1 Design Timeline Layout
- [ ] Create timeline layout mockups/wireframes
- [ ] Choose timeline orientation (horizontal scroll vs vertical)
- [ ] Define milestone card design:
  - [ ] Card dimensions and spacing
  - [ ] Color coding by category
  - [ ] Visual hierarchy for significance
- [ ] Plan responsive breakpoints
- [ ] Document design decisions

### 3.2 Build Timeline Container Component
- [ ] Create `Timeline` component
  ```typescript
  // src/components/Timeline/Timeline.tsx
  interface TimelineProps {
    milestones: Milestone[];
    orientation?: 'horizontal' | 'vertical';
    groupBy?: 'year' | 'decade' | 'category';
  }
  ```
- [ ] Implement scrollable container
- [ ] Add scroll indicators/navigation
- [ ] Create timeline axis/track element
- [ ] Add year/date markers along axis
- [ ] Implement smooth scrolling behavior

### 3.3 Build Milestone Card Component
- [ ] Create `MilestoneCard` component
  ```typescript
  // src/components/Timeline/MilestoneCard.tsx
  interface MilestoneCardProps {
    milestone: Milestone;
    isExpanded?: boolean;
    onSelect?: (id: string) => void;
  }
  ```
- [ ] Design card layout:
  - [ ] Title (prominent)
  - [ ] Date badge
  - [ ] Category indicator (color/icon)
  - [ ] Significance visual (size/glow)
  - [ ] Brief description (truncated)
  - [ ] Organization logo/name
- [ ] Add hover effects
- [ ] Implement click/tap interaction
- [ ] Create loading skeleton variant

### 3.4 Category Visual System
- [ ] Define color palette for categories:
  ```typescript
  const categoryColors = {
    research: '#3B82F6',      // Blue
    model_release: '#10B981', // Green
    breakthrough: '#F59E0B',  // Amber
    product: '#8B5CF6',       // Purple
    regulation: '#EF4444',    // Red
    industry: '#6366F1'       // Indigo
  };
  ```
- [ ] Create category icons using Lucide
- [ ] Build `CategoryBadge` component
- [ ] Create category legend component
- [ ] Ensure color accessibility (contrast ratios)

### 3.5 Significance Visual Indicators
- [ ] Design significance scale visualization
  - [ ] Minor: Small card, subtle styling
  - [ ] Moderate: Medium card
  - [ ] Major: Large card, highlighted
  - [ ] Groundbreaking: Extra large, glowing effect
- [ ] Implement size scaling based on significance
- [ ] Add visual emphasis (shadows, borders)
- [ ] Create `SignificanceBadge` component

### 3.6 Timeline Positioning Logic
- [ ] Calculate milestone positions based on dates
- [ ] Handle overlapping milestones:
  - [ ] Stagger vertically
  - [ ] Group close dates
- [ ] Implement zoom levels:
  - [ ] Decade view
  - [ ] Year view
  - [ ] Month view (for dense periods)
- [ ] Create position calculation utility
  ```typescript
  // src/utils/timelineUtils.ts
  export function calculateMilestonePosition(
    date: Date,
    timeRange: [Date, Date],
    containerWidth: number
  ): number
  ```

### 3.7 Integrate with Timeline Page
- [ ] Update Timeline page to use new components
- [ ] Add category legend to page
- [ ] Implement initial scroll position (current year or latest)
- [ ] Add keyboard navigation support
- [ ] Create responsive layout adjustments

---

## Playwright Tests - Sprint 3

### Test File: `tests/e2e/sprint-03/timeline-ui.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 3: Timeline UI Components', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
  });

  test('timeline container renders', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');
    await expect(timeline).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-container.png',
      fullPage: true
    });
  });

  test('milestone cards display correctly', async ({ page }) => {
    const cards = page.locator('[data-testid="milestone-card"]');
    await expect(cards.first()).toBeVisible();

    // Screenshot of a milestone card
    await cards.first().screenshot({
      path: 'tests/e2e/screenshots/sprint-03/milestone-card.png'
    });
  });

  test('category colors are applied', async ({ page }) => {
    const categories = ['research', 'model_release', 'breakthrough', 'product'];

    for (const category of categories) {
      const card = page.locator(`[data-category="${category}"]`).first();
      if (await card.count() > 0) {
        await card.screenshot({
          path: `tests/e2e/screenshots/sprint-03/category-${category}.png`
        });
      }
    }
  });

  test('significance levels are visually distinct', async ({ page }) => {
    for (let level = 1; level <= 4; level++) {
      const card = page.locator(`[data-significance="${level}"]`).first();
      if (await card.count() > 0) {
        await card.screenshot({
          path: `tests/e2e/screenshots/sprint-03/significance-${level}.png`
        });
      }
    }
  });

  test('timeline is scrollable', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');

    // Screenshot before scroll
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-scroll-start.png'
    });

    // Scroll the timeline
    await timeline.evaluate(el => el.scrollLeft += 500);
    await page.waitForTimeout(500);

    // Screenshot after scroll
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-scroll-end.png'
    });
  });

  test('year markers are visible', async ({ page }) => {
    const yearMarkers = page.locator('[data-testid="year-marker"]');
    await expect(yearMarkers.first()).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/year-markers.png'
    });
  });

  test('category legend displays', async ({ page }) => {
    const legend = page.locator('[data-testid="category-legend"]');
    await expect(legend).toBeVisible();
    await legend.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/category-legend.png'
    });
  });

  test('hover state on milestone card', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();

    // Screenshot before hover
    await card.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/card-normal.png'
    });

    // Hover and screenshot
    await card.hover();
    await page.waitForTimeout(300);
    await card.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/card-hover.png'
    });
  });

  test('responsive - mobile timeline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-mobile.png',
      fullPage: true
    });
  });

  test('responsive - tablet timeline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-tablet.png',
      fullPage: true
    });
  });

  test('loading skeleton displays', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('/api/milestones', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/timeline');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/loading-skeleton.png'
    });
  });
});
```

### Screenshot Checklist
- [ ] `timeline-container.png` - Full timeline view
- [ ] `milestone-card.png` - Single card close-up
- [ ] `category-research.png` - Research category styling
- [ ] `category-model_release.png` - Model release styling
- [ ] `category-breakthrough.png` - Breakthrough styling
- [ ] `category-product.png` - Product styling
- [ ] `significance-1.png` to `significance-4.png` - Significance levels
- [ ] `timeline-scroll-start.png` - Before scroll
- [ ] `timeline-scroll-end.png` - After scroll
- [ ] `year-markers.png` - Year markers on axis
- [ ] `category-legend.png` - Legend component
- [ ] `card-normal.png` - Card default state
- [ ] `card-hover.png` - Card hover state
- [ ] `timeline-mobile.png` - Mobile responsive
- [ ] `timeline-tablet.png` - Tablet responsive
- [ ] `loading-skeleton.png` - Loading state

---

## Acceptance Criteria

- [ ] Timeline container scrolls smoothly
- [ ] Milestone cards display all required information
- [ ] Category colors are visually distinct
- [ ] Significance levels are clearly differentiated
- [ ] Year markers provide temporal context
- [ ] Hover states enhance interactivity
- [ ] Responsive design works on all breakpoints
- [ ] Loading skeleton provides feedback
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
