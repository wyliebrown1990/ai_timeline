import { test, expect } from '@playwright/test';

/**
 * Sprint 1: Project Setup Verification Tests
 * These tests verify the basic application structure is working correctly
 */
test.describe('Sprint 1: Project Setup Verification', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Timeline/);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/homepage.png',
      fullPage: true,
    });
  });

  test('navigation renders correctly', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/navigation.png',
    });
  });

  test('can navigate to timeline page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/timeline"]');
    await expect(page).toHaveURL(/.*timeline/);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/timeline-page.png',
      fullPage: true,
    });
  });

  test('layout structure is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/layout-structure.png',
      fullPage: true,
    });
  });

  test('responsive design - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/mobile-view.png',
      fullPage: true,
    });
  });

  test('responsive design - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/tablet-view.png',
      fullPage: true,
    });
  });

  test('responsive design - desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/desktop-view.png',
      fullPage: true,
    });
  });
});
