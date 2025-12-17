import { test, expect } from '@playwright/test';

test.describe('Checkpoint Integration', () => {
  test('checkpoint appears after Transformer milestone in ChatGPT Story path', async ({ page }) => {
    // Capture browser console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('Checkpoint Debug')) {
        console.log('BROWSER:', text);
      }
    });

    // Clear localStorage to ensure checkpoint hasn't been completed
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Navigate to ChatGPT Story path
    await page.goto('/learn/chatgpt-story?step=1');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Let React settle

    // Verify we're on the Transformer milestone (using the detail title)
    await expect(page.getByTestId('detail-title')).toContainText('Transformer', { timeout: 10000 });

    // Log state before clicking
    console.log('Before clicking Next - checking browser logs...');

    // Click the Next button in the PathNavigation header
    const nextButton = page.locator('button[aria-label="Next milestone"], button:has-text("Next")').first();
    await nextButton.click();

    // Wait and capture any new logs
    await page.waitForTimeout(2000);

    // Log all captured console messages
    console.log('\n=== Browser Console Logs ===');
    consoleLogs.forEach(log => {
      if (log.includes('Checkpoint') || log.includes('path')) {
        console.log(log);
      }
    });
    console.log('=== End Browser Logs ===\n');

    // Check if checkpoint appeared - it should have "Knowledge Check" text
    const knowledgeCheck = page.locator('text=Knowledge Check');

    // Assert checkpoint appeared
    await expect(knowledgeCheck).toBeVisible({ timeout: 5000 });
    console.log('✅ Checkpoint appeared successfully!');
  });

  test('checkpoint data is loaded correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that checkpoints are accessible via contentApi
    const checkpointCount = await page.evaluate(async () => {
      // Access the content directly from the window
      const response = await fetch('/src/content/checkpoints/questions.json');
      const data = await response.json();
      return data.filter((cp: {pathId: string}) => cp.pathId === 'chatgpt-story').length;
    });
    
    expect(checkpointCount).toBeGreaterThan(0);
  });
});
