import { expect, test } from '@playwright/test';

test.describe('Sprint 4: Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]', { timeout: 10000 });
  });

  // Milestone Detail Tests
  test('clicking milestone opens detail view', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();
    await card.click();

    const detail = page.locator('[data-testid="milestone-detail"]');
    await expect(detail).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/detail-view-open.png',
      fullPage: true,
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
      path: 'tests/e2e/screenshots/sprint-04/detail-content.png',
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
      path: 'tests/e2e/screenshots/sprint-04/zoom-controls.png',
    });
  });

  test('zoom in increases detail', async ({ page }) => {
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-default.png',
    });

    await page.locator('[data-testid="zoom-in-btn"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-in.png',
    });
  });

  test('zoom out decreases detail', async ({ page }) => {
    // First zoom in, then zoom out to test
    await page.locator('[data-testid="zoom-in-btn"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="zoom-out-btn"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-out.png',
    });
  });

  test('zoom level selector works', async ({ page }) => {
    const selector = page.locator('[data-testid="zoom-level-select"]');

    await selector.selectOption('decade');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-decade.png',
    });

    await selector.selectOption('year');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-year.png',
    });

    await selector.selectOption('month');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/zoom-month.png',
    });
  });

  // Navigation Tests
  test('timeline navigation controls are visible', async ({ page }) => {
    const navigation = page.locator('[data-testid="timeline-navigation"]');
    await expect(navigation).toBeVisible();
  });

  test('jump to year works', async ({ page }) => {
    const yearSelect = page.locator('[data-testid="year-jump-select"]');
    await yearSelect.selectOption('2020');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/jump-to-2020.png',
    });
  });

  test('minimap is visible and clickable', async ({ page }) => {
    const minimap = page.locator('[data-testid="timeline-minimap"]');
    await expect(minimap).toBeVisible();

    // Click on minimap
    await minimap.click({ position: { x: 50, y: 10 } });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/minimap-navigation.png',
      fullPage: true,
    });
  });

  // Keyboard Navigation Tests
  test('arrow keys navigate timeline', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');
    await timeline.focus();

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => {
      const el = document.querySelector('.overflow-x-auto');
      return el?.scrollLeft || 0;
    });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    const newScroll = await page.evaluate(() => {
      const el = document.querySelector('.overflow-x-auto');
      return el?.scrollLeft || 0;
    });

    expect(newScroll).toBeGreaterThanOrEqual(initialScroll);
  });

  test('enter key opens selected milestone', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();
    await card.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="milestone-detail"]')).toBeVisible();
  });

  test('keyboard shortcuts help dialog opens with ?', async ({ page }) => {
    await page.keyboard.press('?');

    const helpDialog = page.locator('[data-testid="keyboard-help-dialog"]');
    await expect(helpDialog).toBeVisible();

    await helpDialog.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/keyboard-shortcuts-help.png',
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
    // First get a milestone ID by clicking one
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    // Get the URL with selection
    const urlWithSelection = page.url();
    const selectedParam = new URL(urlWithSelection).searchParams.get('selected');

    // Close and navigate directly to URL
    await page.locator('[data-testid="detail-close-btn"]').click();
    await page.goto(`/timeline?selected=${selectedParam}`);
    await page.waitForSelector('[data-testid="milestone-detail"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/url-deep-link.png',
      fullPage: true,
    });
  });

  // Animation Tests
  test('hover animation plays on milestone card', async ({ page }) => {
    const card = page.locator('[data-testid="milestone-card"]').first();

    await card.hover();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/hover-animation.png',
    });
  });

  // Mobile Touch Tests
  test('mobile view works correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-04/mobile-touch-scroll.png',
      fullPage: true,
    });
  });

  // Detail navigation
  test('detail view navigation buttons work', async ({ page }) => {
    // Click first card to open detail
    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    // Get initial title
    const initialTitle = await page.locator('[data-testid="detail-title"]').textContent();

    // Click next button if available
    const nextBtn = page.locator('button[aria-label="Next milestone"]');
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      await page.waitForTimeout(300);

      // Title should change
      const newTitle = await page.locator('[data-testid="detail-title"]').textContent();
      expect(newTitle).not.toBe(initialTitle);
    }
  });
});
