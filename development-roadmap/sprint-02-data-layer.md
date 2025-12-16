# Sprint 2: Data Layer & Models

## Sprint Goal
Establish the data layer with TypeScript types, database schema, and API endpoints for AI milestones.

---

## Prerequisites
- [ ] Sprint 1 completed
- [ ] PostgreSQL installed locally or cloud instance available
- [ ] Basic understanding of Prisma ORM

---

## Tasks

### 2.1 Define Data Models
- [ ] Create TypeScript interfaces for core entities:
  ```typescript
  // src/types/milestone.ts
  interface Milestone {
    id: string;
    title: string;
    description: string;
    date: Date;
    category: MilestoneCategory;
    significance: SignificanceLevel;
    organization?: string;
    contributors?: string[];
    sourceUrl?: string;
    imageUrl?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- [ ] Define category enum:
  ```typescript
  enum MilestoneCategory {
    RESEARCH = 'research',
    MODEL_RELEASE = 'model_release',
    BREAKTHROUGH = 'breakthrough',
    PRODUCT = 'product',
    REGULATION = 'regulation',
    INDUSTRY = 'industry'
  }
  ```
- [ ] Define significance levels:
  ```typescript
  enum SignificanceLevel {
    MINOR = 1,
    MODERATE = 2,
    MAJOR = 3,
    GROUNDBREAKING = 4
  }
  ```
- [ ] Create validation schemas (Zod)

### 2.2 Set Up Backend Server
- [ ] Initialize Express server
  ```bash
  npm install express cors helmet
  npm install -D @types/express @types/cors
  ```
- [ ] Create server directory structure:
  ```
  server/
  ├── src/
  │   ├── routes/
  │   ├── controllers/
  │   ├── middleware/
  │   ├── services/
  │   └── index.ts
  └── package.json
  ```
- [ ] Configure CORS and security middleware
- [ ] Set up error handling middleware
- [ ] Create health check endpoint

### 2.3 Database Setup with Prisma
- [ ] Install Prisma
  ```bash
  npm install prisma @prisma/client
  npx prisma init
  ```
- [ ] Create Prisma schema:
  ```prisma
  // prisma/schema.prisma
  model Milestone {
    id           String    @id @default(cuid())
    title        String
    description  String
    date         DateTime
    category     String
    significance Int
    organization String?
    contributors String[]
    sourceUrl    String?
    imageUrl     String?
    tags         String[]
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt
  }
  ```
- [ ] Run initial migration
  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] Generate Prisma client
- [ ] Create database seed file with sample milestones

### 2.4 Create API Endpoints
- [ ] **GET** `/api/milestones` - List all milestones
- [ ] **GET** `/api/milestones/:id` - Get single milestone
- [ ] **POST** `/api/milestones` - Create new milestone
- [ ] **PUT** `/api/milestones/:id` - Update milestone
- [ ] **DELETE** `/api/milestones/:id` - Delete milestone
- [ ] **GET** `/api/milestones/category/:category` - Filter by category
- [ ] **GET** `/api/milestones/year/:year` - Filter by year
- [ ] Implement pagination for list endpoints

### 2.5 Create Frontend Data Services
- [ ] Create API client utility
  ```typescript
  // src/services/api.ts
  const API_BASE = import.meta.env.VITE_API_URL;

  export const milestonesApi = {
    getAll: () => fetch(`${API_BASE}/milestones`),
    getById: (id: string) => fetch(`${API_BASE}/milestones/${id}`),
    create: (data: CreateMilestoneDto) => ...,
    update: (id: string, data: UpdateMilestoneDto) => ...,
    delete: (id: string) => ...
  };
  ```
- [ ] Create custom React hooks:
  - [ ] `useMilestones()` - Fetch all milestones
  - [ ] `useMilestone(id)` - Fetch single milestone
  - [ ] `useMutationMilestone()` - Create/Update/Delete
- [ ] Implement loading and error states
- [ ] Add data caching strategy

### 2.6 Seed Initial Data
- [ ] Research and compile 20+ real AI milestones:
  - [ ] 1950s: Turing Test proposal
  - [ ] 1956: Dartmouth Conference
  - [ ] 1997: Deep Blue defeats Kasparov
  - [ ] 2011: IBM Watson wins Jeopardy
  - [ ] 2012: AlexNet / ImageNet breakthrough
  - [ ] 2014: GANs introduced
  - [ ] 2017: Transformer architecture
  - [ ] 2018: BERT released
  - [ ] 2020: GPT-3 released
  - [ ] 2022: ChatGPT launched
  - [ ] 2023: GPT-4 released
  - [ ] And more...
- [ ] Create seed script to populate database
- [ ] Verify data loads correctly

---

## Playwright Tests - Sprint 2

### Test File: `tests/e2e/sprint-02/data-layer.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 2: Data Layer Verification', () => {

  test('API health check responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('milestones API returns data', async ({ request }) => {
    const response = await request.get('/api/milestones');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('single milestone API works', async ({ request }) => {
    // Get first milestone
    const listResponse = await request.get('/api/milestones');
    const milestones = await listResponse.json();

    if (milestones.length > 0) {
      const response = await request.get(`/api/milestones/${milestones[0].id}`);
      expect(response.ok()).toBeTruthy();
      const milestone = await response.json();
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('date');
    }
  });

  test('timeline page shows loading state', async ({ page }) => {
    await page.goto('/timeline');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/loading-state.png'
    });
  });

  test('timeline page displays milestones', async ({ page }) => {
    await page.goto('/timeline');
    // Wait for data to load
    await page.waitForSelector('[data-testid="milestone-item"]', {
      timeout: 10000
    });
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/milestones-loaded.png',
      fullPage: true
    });
  });

  test('milestone count matches API', async ({ page, request }) => {
    const apiResponse = await request.get('/api/milestones');
    const apiMilestones = await apiResponse.json();

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-item"]');

    const displayedCount = await page.locator('[data-testid="milestone-item"]').count();
    expect(displayedCount).toBe(apiMilestones.length);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/milestone-count-verified.png',
      fullPage: true
    });
  });

  test('error state displays correctly', async ({ page }) => {
    // Intercept API and force error
    await page.route('/api/milestones', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="error-message"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/error-state.png'
    });
  });

  test('empty state displays correctly', async ({ page }) => {
    // Intercept API and return empty array
    await page.route('/api/milestones', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([])
      });
    });

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="empty-state"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-02/empty-state.png'
    });
  });
});
```

### Screenshot Checklist
- [ ] `loading-state.png` - Loading spinner/skeleton
- [ ] `milestones-loaded.png` - Data displayed successfully
- [ ] `milestone-count-verified.png` - Correct number of items
- [ ] `error-state.png` - Error handling UI
- [ ] `empty-state.png` - Empty data state

---

## Acceptance Criteria

- [ ] All TypeScript types defined and exported
- [ ] Database schema created and migrated
- [ ] All CRUD API endpoints functional
- [ ] Frontend successfully fetches and displays data
- [ ] Loading, error, and empty states handled
- [ ] 20+ milestones seeded in database
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
