import { expect, test } from '@playwright/test';

test.describe('Sprint 3: Timeline UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    // Wait for data to load
    await page.waitForSelector('[data-testid="timeline-container"]', { timeout: 10000 });
  });

  test('timeline container renders', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');
    await expect(timeline).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-container.png',
      fullPage: true,
    });
  });

  test('milestone cards display correctly', async ({ page }) => {
    const cards = page.locator('[data-testid="milestone-card"]');
    await expect(cards.first()).toBeVisible();

    // Screenshot of a milestone card
    await cards.first().screenshot({
      path: 'tests/e2e/screenshots/sprint-03/milestone-card.png',
    });
  });

  test('category colors are applied', async ({ page }) => {
    const categories = ['research', 'model_release', 'breakthrough', 'product'];

    for (const category of categories) {
      const card = page.locator(`[data-category="${category}"]`).first();
      if ((await card.count()) > 0) {
        await card.screenshot({
          path: `tests/e2e/screenshots/sprint-03/category-${category}.png`,
        });
      }
    }
  });

  test('significance levels are visually distinct', async ({ page }) => {
    for (let level = 1; level <= 4; level++) {
      const card = page.locator(`[data-significance="${level}"]`).first();
      if ((await card.count()) > 0) {
        await card.screenshot({
          path: `tests/e2e/screenshots/sprint-03/significance-${level}.png`,
        });
      }
    }
  });

  test('timeline is scrollable', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');

    // Screenshot before scroll
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-scroll-start.png',
    });

    // Scroll the timeline
    await timeline.evaluate((el) => {
      const scrollable = el.querySelector('.overflow-x-auto');
      if (scrollable) {
        scrollable.scrollLeft += 500;
      }
    });
    await page.waitForTimeout(500);

    // Screenshot after scroll
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-scroll-end.png',
    });
  });

  test('year markers are visible', async ({ page }) => {
    const yearMarkers = page.locator('[data-testid="year-marker"]');
    await expect(yearMarkers.first()).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/year-markers.png',
    });
  });

  test('category legend displays', async ({ page }) => {
    const legend = page.locator('[data-testid="category-legend"]');
    await expect(legend).toBeVisible();
    await legend.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/category-legend.png',
    });
  });

  test('hover state on milestone card', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();

    // Screenshot before hover
    await card.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/card-normal.png',
    });

    // Hover and screenshot
    await card.hover();
    await page.waitForTimeout(300);
    await card.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/card-hover.png',
    });
  });

  test('responsive - mobile timeline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-mobile.png',
      fullPage: true,
    });
  });

  test('responsive - tablet timeline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/timeline-tablet.png',
      fullPage: true,
    });
  });

  test('loading skeleton displays', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('**/api/milestones**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/timeline');
    // Capture loading state quickly
    await page.waitForSelector('[data-testid="loading-state"]', { timeout: 5000 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/loading-skeleton.png',
    });
  });

  test('view mode toggle works', async ({ page }) => {
    // Check timeline view is default
    const timelineButton = page.locator('button[aria-label="Timeline view"]');
    await expect(timelineButton).toHaveAttribute('aria-pressed', 'true');

    // Switch to list view
    const listButton = page.locator('button[aria-label="List view"]');
    await listButton.click();
    await expect(listButton).toHaveAttribute('aria-pressed', 'true');

    // Verify grid layout appears in list view
    const grid = page.locator('.grid');
    await expect(grid).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-03/list-view.png',
      fullPage: true,
    });
  });
});
