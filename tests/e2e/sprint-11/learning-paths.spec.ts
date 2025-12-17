import { test, expect } from '@playwright/test';

test('learning paths page loads with all 5 paths', async ({ page }) => {
  await page.goto('http://localhost:3000/learn');
  
  // Wait for path selector to load
  await expect(page.locator('[data-testid="path-selector"]')).toBeVisible({ timeout: 10000 });
  
  // Check all 5 paths are present
  const paths = [
    'The ChatGPT Story',
    'AI Fundamentals', 
    'AI Image Generation',
    'AI for Business Leaders',
    'AI Governance & Policy'
  ];
  
  for (const pathTitle of paths) {
    await expect(page.getByText(pathTitle, { exact: false })).toBeVisible();
  }
  
  console.log('All 5 learning paths are visible!');
});
