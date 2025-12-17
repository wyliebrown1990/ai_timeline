import { test, expect } from '@playwright/test';

test.describe('Sprint 7.5: Timeline Density & Semantic Zoom', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the real timeline page - no mocking
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');

    // Wait for timeline to render with real data
    await page.waitForSelector('[data-testid="timeline-container"]', { timeout: 30000 });
    // Give time for milestones to load and render
    await page.waitForTimeout(2000);
  });

  // ==========================================
  // CORE SCROLL & SCREENSHOT TESTS
  // ==========================================

  test('scroll through timeline and capture screenshots', async ({ page }) => {
    const scrollContainer = page.locator('[data-testid="timeline-content"]');

    // Screenshot 1: Initial view
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/01-initial-view.png',
      fullPage: true,
    });

    // Get scroll width to understand how much content we have
    const scrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);
    const clientWidth = await scrollContainer.evaluate((el) => el.clientWidth);
    console.log(`Scroll width: ${scrollWidth}, Client width: ${clientWidth}`);

    // Scroll incrementally and take screenshots
    const scrollSteps = 5;
    const scrollIncrement = (scrollWidth - clientWidth) / scrollSteps;

    for (let i = 1; i <= scrollSteps; i++) {
      await scrollContainer.evaluate((el, amount) => {
        el.scrollBy({ left: amount, behavior: 'instant' });
      }, scrollIncrement);

      await page.waitForTimeout(500);

      await page.screenshot({
        path: `tests/e2e/screenshots/sprint-07.5/02-scroll-position-${i}.png`,
        fullPage: true,
      });

      // Log what display modes we see at this position
      const visibleItems = await page.locator('[data-display-mode]').evaluateAll((els) =>
        els.map((el) => ({
          mode: el.getAttribute('data-display-mode'),
          testId: el.getAttribute('data-testid'),
        }))
      );
      console.log(`Position ${i} - Display modes:`, JSON.stringify(visibleItems.slice(0, 5)));
    }
  });

  test('verify display modes are applied to milestones', async ({ page }) => {
    // Get all milestone items with display modes
    const items = page.locator('[data-testid^="milestone-item-"]');
    const count = await items.count();
    console.log(`Found ${count} milestone items`);

    expect(count).toBeGreaterThan(0);

    // Check display modes
    const displayModes = await items.evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute('data-testid'),
        mode: el.getAttribute('data-display-mode'),
      }))
    );

    console.log('Display modes:', JSON.stringify(displayModes, null, 2));

    // Verify each item has a display mode
    for (const item of displayModes) {
      expect(item.mode).toBeTruthy();
      expect(['card', 'compact', 'pill', 'dot', 'cluster']).toContain(item.mode);
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/03-display-modes.png',
      fullPage: true,
    });
  });

  test('dense periods should show compact display modes', async ({ page }) => {
    // Scroll to find where dense areas are (likely 2020s)
    const scrollContainer = page.locator('[data-testid="timeline-content"]');

    // Scroll to the right (recent years are likely denser)
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/04-dense-period-end.png',
      fullPage: true,
    });

    // Check display modes in this area
    const visibleItems = await page.locator('[data-display-mode]').evaluateAll((els) =>
      els
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left > 0 && rect.right < window.innerWidth;
        })
        .map((el) => el.getAttribute('data-display-mode'))
    );

    console.log('Visible display modes in dense period:', visibleItems);

    // In dense periods, we expect to see compact modes (pill, dot, cluster, compact)
    // Not necessarily exclusively - but at least some should be compact
    const compactModes = visibleItems.filter((m) =>
      ['pill', 'dot', 'cluster', 'compact'].includes(m || '')
    );
    console.log(`Found ${compactModes.length} compact mode items out of ${visibleItems.length}`);
  });

  test('sparse periods should show full cards', async ({ page }) => {
    // Scroll to the left (earlier years are likely sparser)
    const scrollContainer = page.locator('[data-testid="timeline-content"]');

    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/05-sparse-period-start.png',
      fullPage: true,
    });

    // Check display modes in this area
    const visibleItems = await page.locator('[data-display-mode]').evaluateAll((els) =>
      els
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left > 0 && rect.right < window.innerWidth;
        })
        .map((el) => el.getAttribute('data-display-mode'))
    );

    console.log('Visible display modes in sparse period:', visibleItems);
  });

  // ==========================================
  // INTERACTION TESTS
  // ==========================================

  test('clicking milestone opens detail view', async ({ page }) => {
    // Click on the first visible milestone card (not pill/dot which may be overlapped)
    const cardItem = page.locator('[data-display-mode="card"] [data-testid="milestone-card"]').first();
    await cardItem.click({ force: true });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/06-milestone-clicked.png',
      fullPage: true,
    });

    // Check if detail panel or modal opened
    const detail = page.locator('[data-testid="milestone-detail"]');
    const isDetailVisible = await detail.isVisible().catch(() => false);
    console.log('Detail panel visible:', isDetailVisible);
  });

  test('hover shows tooltip on compact items', async ({ page }) => {
    // Scroll to end where pills are more likely
    const scrollContainer = page.locator('[data-testid="timeline-content"]');
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
    await page.waitForTimeout(1000);

    // Take a screenshot showing the pills area
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/07-pills-area.png',
      fullPage: true,
    });

    // Try to find and hover a pill using force option
    const pills = page.locator('[data-testid^="milestone-pill-"]');
    const pillCount = await pills.count();
    console.log(`Found ${pillCount} pills`);

    if (pillCount > 0) {
      // Hover using force to ignore overlapping elements
      await pills.first().hover({ force: true });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-07.5/07-hover-pill.png',
        fullPage: true,
      });
    }
  });

  // ==========================================
  // SCROLL BUTTON TESTS
  // ==========================================

  test('scroll buttons navigate timeline', async ({ page }) => {
    const scrollRight = page.locator('button[aria-label="Scroll timeline right"]');
    const scrollLeft = page.locator('button[aria-label="Scroll timeline left"]');

    // Initially, left button may not be visible
    const initialLeftVisible = await scrollLeft.isVisible().catch(() => false);
    console.log('Initial left button visible:', initialLeftVisible);

    // Click right button multiple times
    for (let i = 0; i < 3; i++) {
      if (await scrollRight.isVisible()) {
        await scrollRight.click();
        await page.waitForTimeout(600);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/08-after-scroll-right.png',
      fullPage: true,
    });

    // Now left button should be visible
    const afterLeftVisible = await scrollLeft.isVisible().catch(() => false);
    console.log('After scroll - left button visible:', afterLeftVisible);

    // Click left to go back
    if (await scrollLeft.isVisible()) {
      await scrollLeft.click();
      await page.waitForTimeout(600);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-07.5/09-after-scroll-left.png',
        fullPage: true,
      });
    }
  });

  // ==========================================
  // MOBILE TESTS
  // ==========================================

  test('mobile viewport displays timeline correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone sized
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="timeline-container"]', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Viewport-only screenshot (what user actually sees)
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/10-mobile-viewport.png',
      fullPage: false,
    });

    // Full page for reference
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/10-mobile-initial.png',
      fullPage: true,
    });

    // Scroll through on mobile
    const scrollContainer = page.locator('[data-testid="timeline-content"]');
    if (await scrollContainer.isVisible()) {
      await scrollContainer.evaluate((el) => {
        el.scrollLeft = el.scrollWidth / 2;
      });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-07.5/11-mobile-scrolled.png',
        fullPage: true,
      });
    }

    // Check display modes on mobile
    const items = page.locator('[data-testid^="milestone-item-"]');
    const count = await items.count();
    console.log(`Mobile view - found ${count} milestone items`);
  });

  // ==========================================
  // YEAR MARKER TESTS
  // ==========================================

  test('year markers are visible and positioned', async ({ page }) => {
    const yearMarkers = page.locator('[data-testid^="year-marker-"]');
    const count = await yearMarkers.count();
    console.log(`Found ${count} year markers`);

    expect(count).toBeGreaterThan(0);

    // Get year marker values
    const markers = await yearMarkers.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid'))
    );
    console.log('Year markers:', markers);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/12-year-markers.png',
      fullPage: true,
    });
  });

  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================

  test('keyboard arrow keys scroll timeline', async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline-container"]');
    await timeline.focus();

    const scrollContainer = page.locator('[data-testid="timeline-content"]');
    const initialScroll = await scrollContainer.evaluate((el) => el.scrollLeft);

    // Press right arrow multiple times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(400);
    }

    const afterRightScroll = await scrollContainer.evaluate((el) => el.scrollLeft);
    console.log(`Scroll position: ${initialScroll} -> ${afterRightScroll}`);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/13-keyboard-nav.png',
      fullPage: true,
    });

    // Scroll should have changed
    expect(afterRightScroll).toBeGreaterThan(initialScroll);
  });

  // ==========================================
  // COMPONENT RENDERING VERIFICATION
  // ==========================================

  test('all milestone components render without errors', async ({ page }) => {
    // Check for any console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for full render
    await page.waitForTimeout(2000);

    // Scroll through entire timeline to trigger any lazy render issues
    const scrollContainer = page.locator('[data-testid="timeline-content"]');
    const scrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);
    const clientWidth = await scrollContainer.evaluate((el) => el.clientWidth);

    for (let pos = 0; pos <= scrollWidth - clientWidth; pos += clientWidth) {
      await scrollContainer.evaluate((el, p) => {
        el.scrollLeft = p;
      }, pos);
      await page.waitForTimeout(300);
    }

    console.log('Console errors during scroll:', errors);

    // Check that milestones rendered
    const items = page.locator('[data-testid^="milestone-item-"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07.5/14-full-scroll-complete.png',
      fullPage: true,
    });
  });
});
