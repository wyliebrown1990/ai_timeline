# Sprint 1: Project Setup & Foundation

## Sprint Goal
Establish the project foundation with all necessary tooling, configuration, and testing infrastructure.

---

## Prerequisites
- [ ] Node.js v18+ installed
- [ ] npm or yarn package manager
- [ ] Git configured
- [ ] Code editor (VS Code recommended)

---

## Tasks

### 1.1 Initialize Project Structure
- [ ] Create React + TypeScript project with Vite
  ```bash
  npm create vite@latest ai-timeline -- --template react-ts
  ```
- [ ] Configure TypeScript strict mode
- [ ] Set up project folder structure:
  ```
  src/
  ├── components/
  ├── pages/
  ├── hooks/
  ├── utils/
  ├── types/
  ├── services/
  ├── styles/
  └── assets/
  ```
- [ ] Create initial `.gitignore` file
- [ ] Initialize ESLint + Prettier configuration

### 1.2 Install Core Dependencies
- [ ] Install Tailwind CSS and configure
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Install React Router
  ```bash
  npm install react-router-dom
  ```
- [ ] Install date handling library
  ```bash
  npm install date-fns
  ```
- [ ] Install icon library
  ```bash
  npm install lucide-react
  ```

### 1.3 Set Up Testing Infrastructure
- [ ] Install Playwright
  ```bash
  npm init playwright@latest
  ```
- [ ] Configure Playwright for screenshot testing
- [ ] Create test directory structure:
  ```
  tests/
  ├── e2e/
  │   ├── screenshots/
  │   │   └── sprint-01/
  │   └── sprint-01/
  │       └── setup.spec.ts
  └── playwright.config.ts
  ```
- [ ] Install Jest for unit testing
  ```bash
  npm install -D jest @types/jest ts-jest
  ```
- [ ] Create Jest configuration file

### 1.4 Create Base Application Shell
- [ ] Create main App component with router setup
- [ ] Create basic layout component (Header, Main, Footer)
- [ ] Create placeholder Home page
- [ ] Create placeholder Timeline page
- [ ] Add basic navigation between pages
- [ ] Apply base Tailwind styles

### 1.5 Environment Configuration
- [ ] Create `.env.example` file with required variables
- [ ] Set up environment variable handling
- [ ] Create development and production configurations
- [ ] Document environment setup in README

---

## Playwright Tests - Sprint 1

### Test File: `tests/e2e/sprint-01/setup.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 1: Project Setup Verification', () => {

  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Timeline/);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/homepage.png',
      fullPage: true
    });
  });

  test('navigation renders correctly', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/navigation.png'
    });
  });

  test('can navigate to timeline page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/timeline"]');
    await expect(page).toHaveURL(/.*timeline/);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/timeline-page.png',
      fullPage: true
    });
  });

  test('layout structure is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/layout-structure.png',
      fullPage: true
    });
  });

  test('responsive design - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/mobile-view.png',
      fullPage: true
    });
  });

  test('responsive design - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/tablet-view.png',
      fullPage: true
    });
  });

  test('responsive design - desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-01/desktop-view.png',
      fullPage: true
    });
  });
});
```

### Screenshot Checklist
- [ ] `homepage.png` - Full homepage capture
- [ ] `navigation.png` - Navigation component
- [ ] `timeline-page.png` - Timeline page placeholder
- [ ] `layout-structure.png` - Full layout with header/main/footer
- [ ] `mobile-view.png` - Mobile responsive (375px)
- [ ] `tablet-view.png` - Tablet responsive (768px)
- [ ] `desktop-view.png` - Desktop view (1920px)

---

## Acceptance Criteria

- [ ] Project runs with `npm run dev`
- [ ] No TypeScript errors
- [ ] ESLint passes with no warnings
- [ ] All Playwright tests pass
- [ ] Screenshots generated and reviewed
- [ ] Navigation works between Home and Timeline pages
- [ ] Responsive design works on mobile, tablet, and desktop

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
