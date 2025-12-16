# Sprint 6: Search & Filtering

## Sprint Goal
Implement comprehensive search and filtering capabilities for the timeline.

---

## Prerequisites
- [ ] Sprint 5 completed
- [ ] Data management functional
- [ ] Multiple milestones in database

---

## Tasks

### 6.1 Search Infrastructure
- [ ] Create search API endpoint
  ```
  GET /api/milestones/search?q=query
  ```
- [ ] Implement server-side search logic:
  - [ ] Search in title (weighted high)
  - [ ] Search in description
  - [ ] Search in tags
  - [ ] Search in organization
  - [ ] Search in contributors
- [ ] Add search relevance scoring
- [ ] Implement search result highlighting

### 6.2 Search UI Component
- [ ] Create `SearchBar` component
  ```typescript
  // src/components/Search/SearchBar.tsx
  interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    isLoading?: boolean;
  }
  ```
- [ ] Add search icon and clear button
- [ ] Implement debounced search (300ms)
- [ ] Add keyboard shortcut (`/` or `Cmd+K`)
- [ ] Show loading indicator during search
- [ ] Handle empty state

### 6.3 Search Results Display
- [ ] Create `SearchResults` component
- [ ] Display results with:
  - [ ] Title with highlights
  - [ ] Date
  - [ ] Category badge
  - [ ] Matched text snippet
  - [ ] Relevance indicator
- [ ] Enable click to navigate to milestone
- [ ] Show result count
- [ ] Handle no results state

### 6.4 Filter System Architecture
- [ ] Design filter state management
  ```typescript
  // src/types/filters.ts
  interface TimelineFilters {
    categories: MilestoneCategory[];
    significanceLevels: SignificanceLevel[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    organizations: string[];
    tags: string[];
  }
  ```
- [ ] Create filter context/store
- [ ] Implement filter URL synchronization
- [ ] Create filter reset functionality

### 6.5 Category Filter
- [ ] Create `CategoryFilter` component
  ```typescript
  // src/components/Filters/CategoryFilter.tsx
  interface CategoryFilterProps {
    selected: MilestoneCategory[];
    onChange: (categories: MilestoneCategory[]) => void;
  }
  ```
- [ ] Show all category options with colors
- [ ] Allow multi-select
- [ ] Show count per category
- [ ] Add "Select All" / "Clear" buttons

### 6.6 Date Range Filter
- [ ] Create `DateRangeFilter` component
- [ ] Implement date range picker
  ```bash
  npm install react-datepicker @types/react-datepicker
  ```
- [ ] Add preset ranges:
  - [ ] Last 5 years
  - [ ] Last 10 years
  - [ ] 2020s
  - [ ] 2010s
  - [ ] Before 2010
  - [ ] Custom range
- [ ] Validate date range (start < end)
- [ ] Show timeline preview of range

### 6.7 Significance Filter
- [ ] Create `SignificanceFilter` component
- [ ] Visual representation of levels
- [ ] Multi-select checkboxes
- [ ] Show count per level

### 6.8 Tag Filter
- [ ] Create `TagFilter` component
- [ ] Fetch available tags from API
- [ ] Searchable tag list
- [ ] Multi-select with chips
- [ ] Show popular/frequent tags first

### 6.9 Combined Filter Panel
- [ ] Create `FilterPanel` component
  ```typescript
  // src/components/Filters/FilterPanel.tsx
  interface FilterPanelProps {
    filters: TimelineFilters;
    onChange: (filters: TimelineFilters) => void;
    onReset: () => void;
  }
  ```
- [ ] Collapsible sections for each filter
- [ ] Active filter count badge
- [ ] "Clear All Filters" button
- [ ] Mobile-friendly filter drawer
- [ ] Filter presets (saved combinations)

### 6.10 Filter Results Integration
- [ ] Apply filters to timeline view
- [ ] Update milestone count display
- [ ] Animate filter changes on timeline
- [ ] Show "No results" state
- [ ] Preserve scroll position when possible

### 6.11 URL State Management
- [ ] Sync all filters to URL params
  ```
  /timeline?categories=research,product&dateStart=2020-01-01&significance=3,4
  ```
- [ ] Parse URL on page load
- [ ] Update URL without page reload
- [ ] Enable shareable filtered views
- [ ] Handle invalid URL parameters gracefully

---

## Playwright Tests - Sprint 6

### Test File: `tests/e2e/sprint-06/search-filtering.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 6: Search & Filtering', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
  });

  // Search Tests
  test('search bar is visible', async ({ page }) => {
    const searchBar = page.locator('[data-testid="search-bar"]');
    await expect(searchBar).toBeVisible();
    await searchBar.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/search-bar.png'
    });
  });

  test('search keyboard shortcut works', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeFocused();
  });

  test('search returns results', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'GPT');
    await page.waitForTimeout(500); // Debounce

    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/search-results.png',
      fullPage: true
    });
  });

  test('search highlights matches', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'transformer');
    await page.waitForTimeout(500);

    const highlight = page.locator('[data-testid="search-highlight"]');
    await expect(highlight.first()).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/search-highlight.png'
    });
  });

  test('empty search shows no results state', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'xyznonexistent123');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/search-no-results.png'
    });
  });

  test('clicking search result navigates to milestone', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'GPT');
    await page.waitForTimeout(500);

    await page.locator('[data-testid="search-result-item"]').first().click();
    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible();
  });

  // Category Filter Tests
  test('category filter panel works', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();

    const filterPanel = page.locator('[data-testid="filter-panel"]');
    await expect(filterPanel).toBeVisible();

    await filterPanel.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-panel.png'
    });
  });

  test('can filter by single category', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-research"]').click();
    await page.waitForTimeout(300);

    // All visible milestones should be research category
    const cards = page.locator('[data-testid="milestone-card"]');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const category = await cards.nth(i).getAttribute('data-category');
      expect(category).toBe('research');
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-category-single.png',
      fullPage: true
    });
  });

  test('can filter by multiple categories', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-research"]').click();
    await page.locator('[data-testid="category-breakthrough"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-category-multiple.png',
      fullPage: true
    });
  });

  // Date Range Filter Tests
  test('date range filter works', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();

    await page.fill('[data-testid="date-start"]', '2020-01-01');
    await page.fill('[data-testid="date-end"]', '2024-12-31');
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-date-range.png',
      fullPage: true
    });
  });

  test('date preset buttons work', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="date-preset-2020s"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-date-preset.png',
      fullPage: true
    });
  });

  // Significance Filter Tests
  test('significance filter works', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="significance-4"]').click(); // Groundbreaking only
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-significance.png',
      fullPage: true
    });
  });

  // Combined Filters Tests
  test('multiple filter types combine', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();

    // Select category
    await page.locator('[data-testid="category-model_release"]').click();

    // Select date range
    await page.locator('[data-testid="date-preset-2020s"]').click();

    // Select significance
    await page.locator('[data-testid="significance-3"]').click();
    await page.locator('[data-testid="significance-4"]').click();

    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filter-combined.png',
      fullPage: true
    });
  });

  test('active filter count displays', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-research"]').click();
    await page.locator('[data-testid="category-product"]').click();
    await page.locator('[data-testid="significance-4"]').click();

    const badge = page.locator('[data-testid="active-filter-count"]');
    await expect(badge).toContainText('3');
  });

  test('clear all filters works', async ({ page }) => {
    // Apply some filters
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-research"]').click();
    await page.locator('[data-testid="significance-4"]').click();
    await page.waitForTimeout(300);

    // Clear all
    await page.locator('[data-testid="clear-all-filters"]').click();
    await page.waitForTimeout(300);

    // Verify filters cleared
    await expect(page.locator('[data-testid="category-research"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="significance-4"]')).not.toBeChecked();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/filters-cleared.png',
      fullPage: true
    });
  });

  // URL Sync Tests
  test('filters sync to URL', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-breakthrough"]').click();
    await page.waitForTimeout(300);

    const url = page.url();
    expect(url).toContain('categories=breakthrough');
  });

  test('URL filters load on page load', async ({ page }) => {
    await page.goto('/timeline?categories=research&significance=4');
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.locator('[data-testid="filter-toggle"]').click();

    await expect(page.locator('[data-testid="category-research"]')).toBeChecked();
    await expect(page.locator('[data-testid="significance-4"]')).toBeChecked();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/url-filters-loaded.png',
      fullPage: true
    });
  });

  // Mobile Filter Tests
  test('mobile filter drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.locator('[data-testid="filter-toggle"]').click();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/mobile-filter-drawer.png',
      fullPage: true
    });
  });

  // Tag Filter Tests
  test('tag filter works', async ({ page }) => {
    await page.locator('[data-testid="filter-toggle"]').click();

    const tagInput = page.locator('[data-testid="tag-filter-input"]');
    await tagInput.fill('NLP');
    await page.waitForTimeout(300);

    await page.locator('[data-testid="tag-option-NLP"]').click();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-06/tag-filter.png'
    });
  });
});
```

### Screenshot Checklist
- [ ] `search-bar.png` - Search bar component
- [ ] `search-results.png` - Search results dropdown
- [ ] `search-highlight.png` - Highlighted match
- [ ] `search-no-results.png` - No results state
- [ ] `filter-panel.png` - Open filter panel
- [ ] `filter-category-single.png` - Single category filter
- [ ] `filter-category-multiple.png` - Multiple categories
- [ ] `filter-date-range.png` - Date range applied
- [ ] `filter-date-preset.png` - Date preset selected
- [ ] `filter-significance.png` - Significance filter
- [ ] `filter-combined.png` - Multiple filters combined
- [ ] `filters-cleared.png` - After clearing filters
- [ ] `url-filters-loaded.png` - Filters from URL
- [ ] `mobile-filter-drawer.png` - Mobile filter UI
- [ ] `tag-filter.png` - Tag filter selection

---

## Acceptance Criteria

- [ ] Search returns relevant results
- [ ] Search highlights matched text
- [ ] Category filter works with multi-select
- [ ] Date range filter limits timeline
- [ ] Significance filter shows appropriate milestones
- [ ] Multiple filters combine correctly
- [ ] Clear filters resets all
- [ ] Filters sync to URL
- [ ] URL filters load on refresh
- [ ] Mobile filter experience works
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
