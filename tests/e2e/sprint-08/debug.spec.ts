import { test, expect } from '@playwright/test';

const PROD_URL = 'https://d33f170a3u5yyl.cloudfront.net';

test('debug timeline loading', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('requestfailed', request => console.log('FAILED:', request.url(), request.failure()?.errorText));
  
  // Track API requests
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API Response:', response.url(), response.status());
    }
  });
  
  await page.goto(PROD_URL + '/timeline');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/sprint-08/debug-timeline.png',
    fullPage: true
  });
});
