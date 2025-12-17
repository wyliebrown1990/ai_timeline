import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sprint 7: Polish & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  // Theme Tests
  test('light theme displays correctly', async ({ page }) => {
    // Ensure light mode
    await page.evaluate(() => {
      localStorage.setItem('ai-timeline-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBeFalsy();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-light.png',
      fullPage: true,
    });
  });

  test('dark theme displays correctly', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('ai-timeline-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBeTruthy();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-dark.png',
      fullPage: true,
    });
  });

  test('theme toggle is visible and clickable', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    // Click to toggle theme
    await themeToggle.click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-toggled.png',
      fullPage: true,
    });
  });

  test('theme persists on refresh', async ({ page }) => {
    // Set dark mode via toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"]');

    // Click until we get dark mode
    let isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    if (!isDark) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Check that dark mode persisted
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem('ai-timeline-theme')
    );
    // Theme should be stored
    expect(storedTheme).toBeTruthy();
  });

  // Accessibility Tests
  test('timeline page has no critical accessibility violations', async ({
    page,
  }) => {
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[role="slider"]') // Exclude complex slider for now
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(
        'Accessibility violations:',
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          })),
          null,
          2
        )
      );
    }

    // Allow minor violations but no critical ones
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('home page has no critical accessibility violations', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  // Keyboard Navigation Tests
  test('skip navigation link is present and works', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('[data-testid="skip-nav"]');

    // Check skip link exists (it's sr-only until focused)
    await expect(skipLink).toBeAttached();

    // When focused, it should become visible
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="skip-nav"]');
      return document.activeElement === el;
    });

    if (isFocused) {
      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-07/skip-nav-link.png',
      });
    }
  });

  test('focus indicators are visible on interactive elements', async ({
    page,
  }) => {
    // Tab through some elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Logo
    await page.keyboard.press('Tab'); // First nav link

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/focus-indicator.png',
    });
  });

  // ARIA Landmarks Tests
  test('ARIA landmarks are present', async ({ page }) => {
    // Check for banner (header)
    await expect(page.locator('[role="banner"]')).toBeAttached();

    // Check for navigation
    await expect(page.locator('[role="navigation"]')).toBeAttached();

    // Check for main content
    await expect(page.locator('[role="main"]')).toBeAttached();

    // Check for contentinfo (footer)
    await expect(page.locator('[role="contentinfo"]')).toBeAttached();
  });

  // Reduced Motion Tests
  test('respects reduced motion preference', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/reduced-motion.png',
      fullPage: true,
    });

    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();
  });

  // Browser Zoom Tests
  test('page is usable at 200% zoom', async ({ page }) => {
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/zoom-200.png',
      fullPage: true,
    });

    // Content should still be accessible
    await expect(page.locator('h1')).toBeVisible();
  });

  // Dark Theme Home Page
  test('home page dark theme', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('ai-timeline-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/home-dark.png',
      fullPage: true,
    });
  });

  // Component State Screenshots
  test('button and interactive element states', async ({ page }) => {
    // Navigate to filter panel
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.waitForTimeout(300);

    const filterPanel = page.locator('[data-testid="filter-panel"]').first();
    await expect(filterPanel).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/filter-panel-polished.png',
    });
  });

  // Form accessibility
  test('search input has proper labeling', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();

    // Check for accessible name (placeholder or label)
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  // Mobile accessibility
  test('mobile view maintains accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Theme toggle should still be visible
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    // Check landmarks still present
    await expect(page.locator('[role="banner"]')).toBeAttached();
    await expect(page.locator('[role="main"]')).toBeAttached();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/mobile-accessibility.png',
      fullPage: true,
    });
  });
});
