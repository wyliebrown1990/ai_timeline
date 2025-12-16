# Sprint 5: Data Management Interface

## Sprint Goal
Build an admin interface for managing milestones with full CRUD functionality.

---

## Prerequisites
- [ ] Sprint 4 completed
- [ ] API endpoints functional
- [ ] Authentication understanding (if required)

---

## Tasks

### 5.1 Admin Layout & Navigation
- [ ] Create admin route structure
  ```
  /admin
  /admin/milestones
  /admin/milestones/new
  /admin/milestones/:id/edit
  ```
- [ ] Create `AdminLayout` component
  - [ ] Sidebar navigation
  - [ ] Header with user info
  - [ ] Breadcrumb navigation
- [ ] Add admin link to main navigation (conditional)
- [ ] Implement basic route protection (if auth needed)

### 5.2 Milestones List View (Admin)
- [ ] Create `MilestonesList` admin component
  ```typescript
  // src/pages/admin/MilestonesList.tsx
  interface MilestonesListProps {
    milestones: Milestone[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }
  ```
- [ ] Build data table with columns:
  - [ ] Title
  - [ ] Date
  - [ ] Category
  - [ ] Significance
  - [ ] Actions (Edit/Delete)
- [ ] Add sorting by column
- [ ] Add pagination controls
- [ ] Add bulk selection capability
- [ ] Show total count and filtered count

### 5.3 Milestone Form Component
- [ ] Create reusable `MilestoneForm` component
  ```typescript
  // src/components/admin/MilestoneForm.tsx
  interface MilestoneFormProps {
    initialData?: Partial<Milestone>;
    onSubmit: (data: MilestoneFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
  }
  ```
- [ ] Build form fields:
  - [ ] Title (text input, required)
  - [ ] Date (date picker, required)
  - [ ] Description (textarea/rich text)
  - [ ] Category (select dropdown)
  - [ ] Significance (radio/select)
  - [ ] Organization (text input)
  - [ ] Contributors (tag input, multiple)
  - [ ] Source URL (URL input)
  - [ ] Image URL (URL input + preview)
  - [ ] Tags (tag input, multiple)
- [ ] Install form library
  ```bash
  npm install react-hook-form @hookform/resolvers zod
  ```

### 5.4 Form Validation
- [ ] Create Zod validation schemas
  ```typescript
  // src/schemas/milestone.ts
  import { z } from 'zod';

  export const milestoneSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    date: z.date({ required_error: 'Date is required' }),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.enum(['research', 'model_release', 'breakthrough', 'product', 'regulation', 'industry']),
    significance: z.number().min(1).max(4),
    organization: z.string().optional(),
    contributors: z.array(z.string()).optional(),
    sourceUrl: z.string().url().optional().or(z.literal('')),
    imageUrl: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
  });
  ```
- [ ] Display inline validation errors
- [ ] Implement real-time validation
- [ ] Add confirmation for unsaved changes

### 5.5 Create Milestone Page
- [ ] Create `/admin/milestones/new` page
- [ ] Use `MilestoneForm` component
- [ ] Handle form submission:
  - [ ] Validate data
  - [ ] Call API to create
  - [ ] Show success message
  - [ ] Redirect to list
- [ ] Handle errors gracefully
- [ ] Add loading state during submission

### 5.6 Edit Milestone Page
- [ ] Create `/admin/milestones/:id/edit` page
- [ ] Fetch existing milestone data
- [ ] Pre-populate form with data
- [ ] Handle form submission:
  - [ ] Validate changed data
  - [ ] Call API to update
  - [ ] Show success message
  - [ ] Redirect to list
- [ ] Handle 404 if milestone not found

### 5.7 Delete Functionality
- [ ] Create confirmation dialog component
  ```typescript
  // src/components/ui/ConfirmDialog.tsx
  interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
  }
  ```
- [ ] Implement delete confirmation flow
- [ ] Handle API delete call
- [ ] Update list after deletion
- [ ] Add undo functionality (soft delete)
- [ ] Handle bulk delete

### 5.8 Toast Notifications
- [ ] Install toast library
  ```bash
  npm install react-hot-toast
  ```
- [ ] Create toast notification system
- [ ] Add success toasts for:
  - [ ] Milestone created
  - [ ] Milestone updated
  - [ ] Milestone deleted
- [ ] Add error toasts for failures
- [ ] Position and style toasts

---

## Playwright Tests - Sprint 5

### Test File: `tests/e2e/sprint-05/data-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 5: Data Management Interface', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/milestones');
    await page.waitForSelector('[data-testid="admin-milestones-list"]');
  });

  // Admin Navigation Tests
  test('admin layout renders correctly', async ({ page }) => {
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-header"]')).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/admin-layout.png',
      fullPage: true
    });
  });

  test('admin navigation works', async ({ page }) => {
    await page.locator('[data-testid="nav-milestones"]').click();
    await expect(page).toHaveURL(/.*admin\/milestones/);
  });

  // List View Tests
  test('milestones table displays data', async ({ page }) => {
    const table = page.locator('[data-testid="milestones-table"]');
    await expect(table).toBeVisible();

    const rows = page.locator('[data-testid="milestone-row"]');
    expect(await rows.count()).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/milestones-table.png',
      fullPage: true
    });
  });

  test('table sorting works', async ({ page }) => {
    // Click date header to sort
    await page.locator('[data-testid="sort-date"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/table-sorted-date.png',
      fullPage: true
    });

    // Click title header to sort
    await page.locator('[data-testid="sort-title"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/table-sorted-title.png',
      fullPage: true
    });
  });

  test('pagination works', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      await page.locator('[data-testid="page-next"]').click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-05/table-page-2.png',
        fullPage: true
      });
    }
  });

  // Create Milestone Tests
  test('create milestone page loads', async ({ page }) => {
    await page.locator('[data-testid="create-milestone-btn"]').click();
    await expect(page).toHaveURL(/.*admin\/milestones\/new/);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/create-milestone-form.png',
      fullPage: true
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
      fullPage: true
    });
  });

  test('can create new milestone', async ({ page }) => {
    await page.goto('/admin/milestones/new');
    await page.waitForSelector('[data-testid="milestone-form"]');

    // Fill form
    await page.fill('[data-testid="input-title"]', 'Test Milestone');
    await page.fill('[data-testid="input-date"]', '2024-01-15');
    await page.fill('[data-testid="input-description"]', 'This is a test milestone description with enough characters.');
    await page.selectOption('[data-testid="select-category"]', 'research');
    await page.locator('[data-testid="significance-3"]').click();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/form-filled.png',
      fullPage: true
    });

    // Submit
    await page.locator('[data-testid="submit-btn"]').click();

    // Verify redirect and success
    await expect(page).toHaveURL(/.*admin\/milestones/);
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/create-success.png',
      fullPage: true
    });
  });

  // Edit Milestone Tests
  test('can edit existing milestone', async ({ page }) => {
    // Click edit on first row
    await page.locator('[data-testid="edit-btn"]').first().click();
    await expect(page).toHaveURL(/.*admin\/milestones\/.*\/edit/);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/edit-milestone-form.png',
      fullPage: true
    });

    // Modify title
    const titleInput = page.locator('[data-testid="input-title"]');
    await titleInput.fill('Updated Milestone Title');

    // Submit
    await page.locator('[data-testid="submit-btn"]').click();

    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/edit-success.png',
      fullPage: true
    });
  });

  // Delete Milestone Tests
  test('delete confirmation dialog appears', async ({ page }) => {
    await page.locator('[data-testid="delete-btn"]').first().click();

    const dialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/delete-confirmation.png'
    });
  });

  test('can cancel delete', async ({ page }) => {
    const initialCount = await page.locator('[data-testid="milestone-row"]').count();

    await page.locator('[data-testid="delete-btn"]').first().click();
    await page.locator('[data-testid="confirm-cancel"]').click();

    const finalCount = await page.locator('[data-testid="milestone-row"]').count();
    expect(finalCount).toBe(initialCount);
  });

  test('can confirm delete', async ({ page }) => {
    await page.locator('[data-testid="delete-btn"]').first().click();
    await page.locator('[data-testid="confirm-delete"]').click();

    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/delete-success.png',
      fullPage: true
    });
  });

  // Form Field Tests
  test('date picker works', async ({ page }) => {
    await page.goto('/admin/milestones/new');
    await page.locator('[data-testid="input-date"]').click();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/date-picker-open.png'
    });
  });

  test('category dropdown shows options', async ({ page }) => {
    await page.goto('/admin/milestones/new');
    await page.locator('[data-testid="select-category"]').click();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/category-dropdown.png'
    });
  });

  test('tag input allows multiple entries', async ({ page }) => {
    await page.goto('/admin/milestones/new');

    const tagInput = page.locator('[data-testid="input-tags"]');
    await tagInput.fill('AI');
    await page.keyboard.press('Enter');
    await tagInput.fill('Machine Learning');
    await page.keyboard.press('Enter');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/tags-input.png'
    });
  });

  // Toast Notification Tests
  test('toast notifications display correctly', async ({ page }) => {
    await page.goto('/admin/milestones/new');
    await page.waitForSelector('[data-testid="milestone-form"]');

    // Fill minimum required fields
    await page.fill('[data-testid="input-title"]', 'Toast Test Milestone');
    await page.fill('[data-testid="input-date"]', '2024-06-01');
    await page.fill('[data-testid="input-description"]', 'Testing toast notification display.');
    await page.selectOption('[data-testid="select-category"]', 'product');
    await page.locator('[data-testid="significance-2"]').click();

    await page.locator('[data-testid="submit-btn"]').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast).toBeVisible();

    await toast.screenshot({
      path: 'tests/e2e/screenshots/sprint-05/toast-success.png'
    });
  });
});
```

### Screenshot Checklist
- [ ] `admin-layout.png` - Full admin layout
- [ ] `milestones-table.png` - Data table view
- [ ] `table-sorted-date.png` - Sorted by date
- [ ] `table-sorted-title.png` - Sorted by title
- [ ] `table-page-2.png` - Pagination
- [ ] `create-milestone-form.png` - Empty create form
- [ ] `form-validation-errors.png` - Validation errors shown
- [ ] `form-filled.png` - Form with data
- [ ] `create-success.png` - After successful create
- [ ] `edit-milestone-form.png` - Edit form with data
- [ ] `edit-success.png` - After successful edit
- [ ] `delete-confirmation.png` - Delete dialog
- [ ] `delete-success.png` - After successful delete
- [ ] `date-picker-open.png` - Date picker UI
- [ ] `category-dropdown.png` - Category options
- [ ] `tags-input.png` - Multiple tags entered
- [ ] `toast-success.png` - Success notification

---

## Acceptance Criteria

- [ ] Admin layout with navigation functional
- [ ] Milestones list with sorting and pagination
- [ ] Create milestone form with validation
- [ ] Edit milestone preserves existing data
- [ ] Delete with confirmation dialog
- [ ] Toast notifications for all actions
- [ ] Form validates in real-time
- [ ] All CRUD operations work end-to-end
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
