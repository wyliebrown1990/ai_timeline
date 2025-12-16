# Sprint 4: Interactive Timeline Features

## Sprint Goal
Add rich interactivity to the timeline including milestone details view, zoom controls, and navigation features.

---

## Prerequisites
- [ ] Sprint 3 completed
- [ ] Timeline UI components functional
- [ ] Basic timeline scrolling working

---

## Tasks

### 4.1 Milestone Detail Modal/Panel
- [ ] Create `MilestoneDetail` component
  ```typescript
  // src/components/Timeline/MilestoneDetail.tsx
  interface MilestoneDetailProps {
    milestone: Milestone;
    onClose: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
  }
  ```
- [ ] Design detail view layout:
  - [ ] Full title and description
  - [ ] Formatted date
  - [ ] Category badge with label
  - [ ] Significance indicator
  - [ ] Organization information
  - [ ] Contributors list
  - [ ] Source link (external)
  - [ ] Related milestones
- [ ] Add image/media display if available
- [ ] Implement slide-in panel or modal
- [ ] Add close button and escape key handler
- [ ] Add next/previous navigation

### 4.2 Timeline Zoom Controls
- [ ] Create `ZoomControls` component
  ```typescript
  // src/components/Timeline/ZoomControls.tsx
  interface ZoomControlsProps {
    currentZoom: ZoomLevel;
    onZoomChange: (level: ZoomLevel) => void;
  }

  type ZoomLevel = 'decade' | 'year' | 'month';
  ```
- [ ] Implement zoom levels:
  - [ ] **Decade**: 10 years per screen width
  - [ ] **Year**: 1 year per screen width
  - [ ] **Month**: 1 month per screen width
- [ ] Add zoom in/out buttons
- [ ] Add zoom slider
- [ ] Implement pinch-to-zoom on touch devices
- [ ] Animate zoom transitions
- [ ] Maintain scroll position during zoom

### 4.3 Timeline Navigation
- [ ] Create `TimelineNavigation` component
- [ ] Implement features:
  - [ ] Jump to year dropdown
  - [ ] Jump to decade buttons
  - [ ] "Today" / "Latest" button
  - [ ] Previous/Next significant milestone buttons
- [ ] Create mini-map overview
  ```typescript
  // src/components/Timeline/TimelineMinimap.tsx
  interface TimelineMinimapProps {
    milestones: Milestone[];
    visibleRange: [Date, Date];
    onNavigate: (date: Date) => void;
  }
  ```
- [ ] Show visible area indicator
- [ ] Enable click-to-navigate on minimap

### 4.4 Keyboard Navigation
- [ ] Implement keyboard shortcuts:
  - [ ] `←` / `→`: Scroll timeline
  - [ ] `↑` / `↓`: Navigate between milestones
  - [ ] `Enter`: Open selected milestone detail
  - [ ] `Escape`: Close detail view
  - [ ] `+` / `-`: Zoom in/out
  - [ ] `Home`: Jump to earliest
  - [ ] `End`: Jump to latest
- [ ] Add focus indicators for accessibility
- [ ] Create keyboard shortcut help dialog
- [ ] Implement focus management

### 4.5 Touch Gestures (Mobile)
- [ ] Implement touch interactions:
  - [ ] Swipe to scroll
  - [ ] Pinch to zoom
  - [ ] Tap to select milestone
  - [ ] Long press for quick preview
- [ ] Add momentum scrolling
- [ ] Prevent browser gestures from interfering
- [ ] Test on actual mobile devices

### 4.6 Milestone Selection State
- [ ] Implement selection management
  ```typescript
  // src/hooks/useTimelineSelection.ts
  interface UseTimelineSelectionReturn {
    selectedId: string | null;
    select: (id: string) => void;
    deselect: () => void;
    selectNext: () => void;
    selectPrevious: () => void;
  }
  ```
- [ ] Visual highlight for selected milestone
- [ ] Scroll selected into view
- [ ] URL sync for selected milestone
  - [ ] `/timeline?selected=abc123`
- [ ] Shareable links to specific milestones

### 4.7 Animations and Transitions
- [ ] Add smooth animations for:
  - [ ] Milestone card hover
  - [ ] Selection highlight
  - [ ] Detail panel open/close
  - [ ] Zoom level changes
  - [ ] Scroll position changes
- [ ] Use `framer-motion` or CSS transitions
  ```bash
  npm install framer-motion
  ```
- [ ] Respect `prefers-reduced-motion`
- [ ] Ensure animations don't block interaction

---

## Playwright Tests - Sprint 4

### Test File: `tests/e2e/sprint-04/interactive-features.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 4: Interactive Features', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
  });

  // Milestone Detail Tests
  test('clicking milestone opens detail view', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();
    await card.click();

    const detail = page.locator('[data-testid="milestone-detail"]');
    await expect(detail).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/detail-view-open.png',
      fullPage: true
    });
  });

  test('detail view shows all milestone information', async ({ page }) => {
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    await expect(page.locator('[data-testid="detail-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="detail-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="detail-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="detail-category"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/detail-content.png'
    });
  });

  test('detail view closes on escape key', async ({ page }) => {
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="milestone-detail"]')).not.toBeVisible();
  });

  test('detail view close button works', async ({ page }) => {
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    await page.locator('[data-testid="detail-close-btn"]').click();
    await expect(page.locator('[data-testid="milestone-detail"]')).not.toBeVisible();
  });

  // Zoom Control Tests
  test('zoom controls are visible', async ({ page }) => {
    const zoomControls = page.locator('[data-testid="zoom-controls"]');
    await expect(zoomControls).toBeVisible();
    await zoomControls.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-controls.png'
    });
  });

  test('zoom in increases detail', async ({ page }) => {
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-default.png'
    });

    await page.locator('[data-testid="zoom-in-btn"]').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-in.png'
    });
  });

  test('zoom out decreases detail', async ({ page }) => {
    await page.locator('[data-testid="zoom-out-btn"]').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-out.png'
    });
  });

  test('zoom level selector works', async ({ page }) => {
    const selector = page.locator('[data-testid="zoom-level-select"]');

    await selector.selectOption('decade');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-decade.png'
    });

    await selector.selectOption('year');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-year.png'
    });

    await selector.selectOption('month');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-month.png'
    });
  });

  // Navigation Tests
  test('jump to year works', async ({ page }) => {
    const yearSelect = page.locator('[data-testid="year-jump-select"]');
    await yearSelect.selectOption('2020');
    await page.waitForTimeout(500);

    // Verify scroll position changed
    const marker2020 = page.locator('[data-testid="year-marker-2020"]');
    await expect(marker2020).toBeInViewport();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/jump-to-2020.png'
    });
  });

  test('minimap navigation works', async ({ page }) => {
    const minimap = page.locator('[data-testid="timeline-minimap"]');
    await expect(minimap).toBeVisible();

    // Click on different area of minimap
    await minimap.click({ position: { x: 50, y: 10 } });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/minimap-navigation.png',
      fullPage: true
    });
  });

  // Keyboard Navigation Tests
  test('arrow keys navigate timeline', async ({ page }) => {
    await page.locator('[data-testid="timeline-container"]').focus();

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="timeline-container"]');
      return el?.scrollLeft || 0;
    });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const newScroll = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="timeline-container"]');
      return el?.scrollLeft || 0;
    });

    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('enter key opens selected milestone', async ({ page }) => {
    await page.locator('[data-testid="milestone-card"]').first().focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible();
  });

  test('keyboard shortcuts help dialog', async ({ page }) => {
    await page.keyboard.press('?');

    const helpDialog = page.locator('[data-testid="keyboard-help-dialog"]');
    await expect(helpDialog).toBeVisible();

    await helpDialog.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/keyboard-shortcuts-help.png'
    });
  });

  // URL State Tests
  test('selecting milestone updates URL', async ({ page }) => {
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    const url = page.url();
    expect(url).toContain('selected=');
  });

  test('URL with selected opens correct milestone', async ({ page }) => {
    // First get a milestone ID
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    const milestoneId = await page.locator('[data-testid="milestone-card"]')
      .first()
      .getAttribute('data-milestone-id');

    // Navigate directly to URL with selection
    await page.goto(`/timeline?selected=${milestoneId}`);
    await page.waitForSelector('[data-testid="milestone-detail"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/url-deep-link.png',
      fullPage: true
    });
  });

  // Animation Tests
  test('hover animation plays', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();

    await card.hover();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/hover-animation.png'
    });
  });

  // Mobile Touch Tests
  test('touch scroll works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    const timeline = page.locator('[data-testid="timeline-container"]');

    // Simulate touch swipe
    await timeline.evaluate(el => {
      el.scrollLeft = 200;
    });

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/mobile-touch-scroll.png',
      fullPage: true
    });
  });
});
```

### Screenshot Checklist
- [ ] `detail-view-open.png` - Milestone detail panel/modal
- [ ] `detail-content.png` - Detail view content
- [ ] `zoom-controls.png` - Zoom control UI
- [ ] `zoom-default.png` - Default zoom level
- [ ] `zoom-in.png` - Zoomed in view
- [ ] `zoom-out.png` - Zoomed out view
- [ ] `zoom-decade.png` - Decade zoom level
- [ ] `zoom-year.png` - Year zoom level
- [ ] `zoom-month.png` - Month zoom level
- [ ] `jump-to-2020.png` - After year navigation
- [ ] `minimap-navigation.png` - Minimap usage
- [ ] `keyboard-shortcuts-help.png` - Help dialog
- [ ] `url-deep-link.png` - Deep link functionality
- [ ] `hover-animation.png` - Hover state animation
- [ ] `mobile-touch-scroll.png` - Mobile touch interaction

---

## Acceptance Criteria

- [ ] Milestone detail view shows complete information
- [ ] Zoom controls work at all levels
- [ ] Navigation features enable quick timeline traversal
- [ ] Keyboard navigation fully functional
- [ ] Touch gestures work on mobile devices
- [ ] URL reflects current selection state
- [ ] Animations are smooth and non-blocking
- [ ] Accessibility requirements met
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
