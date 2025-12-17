import { test, expect } from '@playwright/test';

const PROD_URL = 'https://d33f170a3u5yyl.cloudfront.net';

test('production site loads correctly', async ({ page }) => {
  console.log('Testing:', PROD_URL);
  
  await page.goto(PROD_URL);
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveTitle(/AI Timeline/);
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/sprint-08/production-home.png',
    fullPage: true
  });
  
  console.log('Homepage loaded successfully');
});

test('timeline page loads with data', async ({ page }) => {
  await page.goto(PROD_URL + '/timeline');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const timeline = page.locator('[data-testid="timeline-container"]');
  await expect(timeline).toBeVisible({ timeout: 10000 });
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/sprint-08/production-timeline.png',
    fullPage: false
  });
  
  console.log('Timeline loaded successfully');
});
