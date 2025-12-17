import { test, expect } from '@playwright/test';

test.describe('Sprint 2: Data Layer Verification', () => {
  test('API health check responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('milestones API returns data', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/milestones');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBeGreaterThan(0);
    expect(data).toHaveProperty('pagination');
  });

  test('single milestone API works', async ({ request }) => {
    // Get first milestone from list
    const listResponse = await request.get('http://localhost:3001/api/milestones');
    const listData = await listResponse.json();

    if (listData.data.length > 0) {
      const response = await request.get(
        `http://localhost:3001/api/milestones/${listData.data[0].id}`
      );
      expect(response.ok()).toBeTruthy();

      const milestone = await response.json();
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('date');
      expect(milestone).toHaveProperty('category');
      expect(milestone).toHaveProperty('significance');
    }
  });

  test('timeline page shows loading state', async ({ page }) => {
    // Slow down network to catch loading state
    await page.route('**/api/milestones*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/timeline');

    // Capture loading state
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/loading-state.png',
    });

    // Wait for loading to complete
    await page.waitForSelector('[data-testid="milestone-card"]', { timeout: 10000 });
  });

  test('timeline page displays milestones', async ({ page }) => {
    await page.goto('/timeline');

    // Wait for data to load
    await page.waitForSelector('[data-testid="milestone-card"]', {
      timeout: 10000,
    });

    // Verify milestones are displayed
    const milestones = await page.locator('[data-testid="milestone-card"]').all();
    expect(milestones.length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/milestones-loaded.png',
      fullPage: true,
    });
  });

  test('milestone count matches API', async ({ page, request }) => {
    // Get count from API
    const apiResponse = await request.get('http://localhost:3001/api/milestones?limit=100');
    const apiData = await apiResponse.json();

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    const displayedCount = await page.locator('[data-testid="milestone-card"]').count();

    // Count should match (accounting for pagination limit)
    expect(displayedCount).toBe(apiData.data.length);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/milestone-count-verified.png',
      fullPage: true,
    });
  });

  test('error state displays correctly', async ({ page }) => {
    // Intercept API and force error
    await page.route('**/api/milestones*', (route) => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="error-message"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/error-state.png',
    });

    // Verify error message is displayed
    const errorMessage = await page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('empty state displays correctly', async ({ page }) => {
    // Intercept API and return empty array
    await page.route('**/api/milestones*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
        }),
      });
    });

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="empty-state"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/empty-state.png',
    });

    // Verify empty state is displayed
    const emptyState = await page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
  });

  test('milestone cards show correct information', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    // Check first milestone card has expected elements
    const firstMilestone = page.locator('[data-testid="milestone-card"]').first();

    // Should have a title (h3 element)
    const title = firstMilestone.locator('h3');
    await expect(title).toBeVisible();

    // Should have a year displayed
    const year = firstMilestone.locator('text=/\\d{4}/').first();
    await expect(year).toBeVisible();
  });

  test('API pagination works correctly', async ({ request }) => {
    // Get first page
    const page1Response = await request.get('http://localhost:3001/api/milestones?page=1&limit=5');
    expect(page1Response.ok()).toBeTruthy();
    const page1Data = await page1Response.json();

    expect(page1Data.data.length).toBeLessThanOrEqual(5);
    expect(page1Data.pagination.page).toBe(1);
    expect(page1Data.pagination.limit).toBe(5);

    // Get second page if there are more results
    if (page1Data.pagination.totalPages > 1) {
      const page2Response = await request.get(
        'http://localhost:3001/api/milestones?page=2&limit=5'
      );
      expect(page2Response.ok()).toBeTruthy();
      const page2Data = await page2Response.json();

      expect(page2Data.pagination.page).toBe(2);

      // Ensure different results on different pages
      if (page2Data.data.length > 0) {
        expect(page2Data.data[0].id).not.toBe(page1Data.data[0].id);
      }
    }
  });
});
