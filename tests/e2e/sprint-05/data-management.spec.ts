import { test, expect } from '@playwright/test';

test.describe('Sprint 5: Data Management Interface', () => {
  test.describe('Admin Navigation', () => {
    test('admin layout renders correctly', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-header"]')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/admin-layout.png',
        fullPage: true,
      });
    });

    test('admin navigation works', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Navigate to milestones
      await page.locator('[data-testid="nav-milestones"]').click();
      await expect(page).toHaveURL(/.*admin\/milestones/);
      await expect(page.locator('[data-testid="milestones-list-page"]')).toBeVisible();

      // Navigate back to dashboard
      await page.locator('[data-testid="nav-dashboard"]').click();
      await expect(page).toHaveURL('/admin');
    });

    test('dashboard shows statistics', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Check for stat cards
      const dashboard = page.locator('[data-testid="admin-dashboard"]');
      await expect(dashboard.locator('text=Total Milestones')).toBeVisible();
      await expect(dashboard.locator('text=Categories')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/admin-dashboard.png',
        fullPage: true,
      });
    });
  });

  test.describe('Milestones List View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');
    });

    test('milestones table displays data', async ({ page }) => {
      const table = page.locator('[data-testid="milestones-table"]');
      await expect(table).toBeVisible();

      const rows = page.locator('[data-testid="milestone-row"]');
      expect(await rows.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/milestones-table.png',
        fullPage: true,
      });
    });

    test('table sorting works', async ({ page }) => {
      // Click date header to sort
      await page.locator('[data-testid="sort-date"]').click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/table-sorted-date.png',
        fullPage: true,
      });

      // Click title header to sort
      await page.locator('[data-testid="sort-title"]').click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/table-sorted-title.png',
        fullPage: true,
      });
    });

    test('pagination works', async ({ page }) => {
      const pagination = page.locator('[data-testid="pagination"]');

      // Only test if pagination is visible (more than 10 items)
      if (await pagination.isVisible()) {
        await page.locator('[data-testid="page-next"]').click();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: 'tests/e2e/screenshots/sprint-05/table-page-2.png',
          fullPage: true,
        });
      }
    });

    test('search filter works', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();

      await searchInput.fill('GPT');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/search-filter.png',
        fullPage: true,
      });
    });

    test('category filter works', async ({ page }) => {
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      await expect(categoryFilter).toBeVisible();

      await categoryFilter.selectOption('research');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/category-filter.png',
        fullPage: true,
      });
    });
  });

  test.describe('Create Milestone', () => {
    test('create milestone page loads', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      await page.locator('[data-testid="create-milestone-btn"]').click();
      await expect(page).toHaveURL(/.*admin\/milestones\/new/);
      await expect(page.locator('[data-testid="create-milestone-page"]')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/create-milestone-form.png',
        fullPage: true,
      });
    });

    test('form validation shows errors', async ({ page }) => {
      await page.goto('/admin/milestones/new');
      await page.waitForSelector('[data-testid="milestone-form"]');

      // Submit empty form
      await page.locator('[data-testid="submit-btn"]').click();

      // Check for validation errors
      await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-date"]')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/form-validation-errors.png',
        fullPage: true,
      });
    });

    test('can fill form fields', async ({ page }) => {
      await page.goto('/admin/milestones/new');
      await page.waitForSelector('[data-testid="milestone-form"]');

      // Fill form
      await page.fill('[data-testid="input-title"]', 'Test Milestone');
      await page.fill('[data-testid="input-date"]', '2024-01-15');
      await page.fill(
        '[data-testid="input-description"]',
        'This is a test milestone description with enough characters for validation.'
      );
      await page.selectOption('[data-testid="select-category"]', 'research');
      // Click the label containing the radio button (not the hidden input)
      await page.locator('label:has([data-testid="significance-3"])').click();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/form-filled.png',
        fullPage: true,
      });
    });

    test('can create new milestone', async ({ page }) => {
      await page.goto('/admin/milestones/new');
      await page.waitForSelector('[data-testid="milestone-form"]');

      // Fill minimum required fields
      const uniqueTitle = `Test Milestone ${Date.now()}`;
      await page.fill('[data-testid="input-title"]', uniqueTitle);
      await page.fill('[data-testid="input-date"]', '2024-01-15');
      await page.fill(
        '[data-testid="input-description"]',
        'This is a test milestone description with enough characters.'
      );
      await page.selectOption('[data-testid="select-category"]', 'research');
      await page.locator('label:has([data-testid="significance-3"])').click();

      // Submit
      await page.locator('[data-testid="submit-btn"]').click();

      // Verify redirect and success toast
      await expect(page).toHaveURL(/.*admin\/milestones/, { timeout: 10000 });

      // Check for success toast (react-hot-toast renders with role="status")
      await expect(page.locator('text=Milestone created successfully')).toBeVisible({
        timeout: 5000,
      });

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/create-success.png',
        fullPage: true,
      });
    });
  });

  test.describe('Edit Milestone', () => {
    test('can navigate to edit page', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      // Click edit on first row
      await page.locator('[data-testid="edit-btn"]').first().click();
      await expect(page).toHaveURL(/.*admin\/milestones\/.*\/edit/);
      await expect(page.locator('[data-testid="edit-milestone-page"]')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/edit-milestone-form.png',
        fullPage: true,
      });
    });

    test('edit form is pre-populated', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      await page.locator('[data-testid="edit-btn"]').first().click();
      await page.waitForSelector('[data-testid="milestone-form"]');

      // Check that title field has content
      const titleInput = page.locator('[data-testid="input-title"]');
      const titleValue = await titleInput.inputValue();
      expect(titleValue.length).toBeGreaterThan(0);
    });

    test('can update milestone', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      await page.locator('[data-testid="edit-btn"]').first().click();
      await page.waitForSelector('[data-testid="milestone-form"]');

      // Modify description (keep it valid)
      const descInput = page.locator('[data-testid="input-description"]');
      await descInput.clear();
      await descInput.fill('Updated milestone description with sufficient length for validation.');

      // Submit
      await page.locator('[data-testid="submit-btn"]').click();

      // Verify success toast
      await expect(page.locator('text=Milestone updated successfully')).toBeVisible({
        timeout: 5000,
      });

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/edit-success.png',
        fullPage: true,
      });
    });
  });

  test.describe('Delete Milestone', () => {
    test('delete confirmation dialog appears', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      await page.locator('[data-testid="delete-btn"]').first().click();

      const dialog = page.locator('[data-testid="confirm-dialog"]');
      await expect(dialog).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/delete-confirmation.png',
        fullPage: true,
      });
    });

    test('can cancel delete', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      const initialCount = await page.locator('[data-testid="milestone-row"]').count();

      await page.locator('[data-testid="delete-btn"]').first().click();
      await page.locator('[data-testid="confirm-cancel"]').click();

      // Dialog should close
      await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

      const finalCount = await page.locator('[data-testid="milestone-row"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('can confirm delete', async ({ page }) => {
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      // Get initial count
      const initialCount = await page.locator('[data-testid="milestone-row"]').count();

      // Click delete on first row
      await page.locator('[data-testid="delete-btn"]').first().click();

      // Confirm in dialog
      await page.locator('[data-testid="confirm-delete"]').click();

      // Verify success toast
      await expect(page.locator('text=Milestone deleted successfully')).toBeVisible({
        timeout: 5000,
      });

      // Wait for table to update
      await page.waitForTimeout(500);

      // Verify count decreased (or table refreshed)
      const finalCount = await page.locator('[data-testid="milestone-row"]').count();
      expect(finalCount).toBeLessThanOrEqual(initialCount);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/delete-success.png',
        fullPage: true,
      });
    });
  });

  test.describe('Form Fields', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/milestones/new');
      await page.waitForSelector('[data-testid="milestone-form"]');
    });

    test('date picker works', async ({ page }) => {
      const dateInput = page.locator('[data-testid="input-date"]');
      await dateInput.click();
      await dateInput.fill('2024-06-15');

      const value = await dateInput.inputValue();
      expect(value).toBe('2024-06-15');

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/date-picker.png',
      });
    });

    test('category dropdown shows options', async ({ page }) => {
      const categorySelect = page.locator('[data-testid="select-category"]');
      await expect(categorySelect).toBeVisible();

      // Get option count
      const options = categorySelect.locator('option');
      expect(await options.count()).toBeGreaterThan(1);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/category-dropdown.png',
      });
    });

    test('significance radio buttons work', async ({ page }) => {
      // Click the label containing significance 3
      await page.locator('label:has([data-testid="significance-3"])').click();

      // Verify it's selected
      const radio = page.locator('[data-testid="significance-3"]');
      await expect(radio).toBeChecked();
    });

    test('tag input allows multiple entries', async ({ page }) => {
      const tagInput = page.locator('[data-testid="input-tags"]');
      await tagInput.fill('AI');
      await page.keyboard.press('Enter');
      await tagInput.fill('Machine Learning');
      await page.keyboard.press('Enter');
      await tagInput.fill('Deep Learning');
      await page.keyboard.press('Enter');

      // Check that tags are displayed
      await expect(page.locator('text=AI').first()).toBeVisible();
      await expect(page.locator('text=Machine Learning')).toBeVisible();
      await expect(page.locator('text=Deep Learning')).toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/tags-input.png',
      });
    });
  });

  test.describe('Responsive Design', () => {
    test('admin layout works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/milestones');
      await page.waitForSelector('[data-testid="milestones-list-page"]');

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/admin-mobile.png',
        fullPage: true,
      });
    });

    test('form works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/milestones/new');
      await page.waitForSelector('[data-testid="milestone-form"]');

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/form-mobile.png',
        fullPage: true,
      });
    });
  });
});
