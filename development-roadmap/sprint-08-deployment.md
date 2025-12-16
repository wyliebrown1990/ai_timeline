# Sprint 8: Deployment & Launch

## Sprint Goal
Prepare the application for production deployment with CI/CD, monitoring, and launch readiness.

---

## Prerequisites
- [ ] Sprint 7 completed
- [ ] All features functional
- [ ] All tests passing
- [ ] Hosting accounts ready (Vercel, Railway, etc.)

---

## Tasks

### 8.1 Production Build Configuration
- [ ] Optimize Vite build configuration
  ```typescript
  // vite.config.ts
  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            timeline: ['framer-motion', 'date-fns'],
          }
        }
      },
      minify: 'terser',
      sourcemap: true
    }
  });
  ```
- [ ] Configure environment variables
  ```
  VITE_API_URL=https://api.aitimeline.com
  VITE_APP_ENV=production
  ```
- [ ] Set up production database connection
- [ ] Enable gzip/brotli compression
- [ ] Configure caching headers

### 8.2 CI/CD Pipeline Setup
- [ ] Create GitHub Actions workflow
  ```yaml
  # .github/workflows/ci.yml
  name: CI/CD Pipeline

  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]

  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm ci
        - run: npm run lint
        - run: npm run type-check
        - run: npm run test
        - run: npx playwright install --with-deps
        - run: npm run test:e2e

    deploy:
      needs: test
      if: github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm ci
        - run: npm run build
        # Deploy steps...
  ```
- [ ] Set up branch protection rules
- [ ] Configure test coverage reporting
- [ ] Add status badges to README

### 8.3 Frontend Deployment (Vercel)
- [ ] Connect repository to Vercel
- [ ] Configure build settings:
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist`
  - [ ] Node.js version: 20.x
- [ ] Set environment variables in Vercel dashboard
- [ ] Configure custom domain (if available)
- [ ] Enable preview deployments for PRs
- [ ] Set up redirects and rewrites

### 8.4 Backend Deployment (Railway/Render)
- [ ] Create Railway/Render project
- [ ] Configure PostgreSQL database
- [ ] Set environment variables:
  ```
  DATABASE_URL=postgresql://...
  NODE_ENV=production
  CORS_ORIGIN=https://aitimeline.com
  ```
- [ ] Configure auto-deploy from main branch
- [ ] Set up health check endpoint
- [ ] Configure scaling settings

### 8.5 Database Production Setup
- [ ] Create production database instance
- [ ] Run Prisma migrations
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Seed production data (curated milestones)
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Test database connectivity

### 8.6 Monitoring & Observability
- [ ] Set up error tracking (Sentry)
  ```bash
  npm install @sentry/react
  ```
  ```typescript
  // src/main.tsx
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV,
  });
  ```
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring (UptimeRobot/Checkly)
- [ ] Create status page
- [ ] Set up alerting for errors/downtime

### 8.7 Analytics Setup
- [ ] Integrate privacy-friendly analytics (Plausible/Fathom)
- [ ] Track key events:
  - [ ] Page views
  - [ ] Milestone views
  - [ ] Search queries
  - [ ] Filter usage
  - [ ] Time on page
- [ ] Create analytics dashboard
- [ ] Ensure GDPR compliance

### 8.8 Security Hardening
- [ ] Enable HTTPS everywhere
- [ ] Configure security headers:
  ```typescript
  // Headers configuration
  {
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
  ```
- [ ] Set up rate limiting on API
- [ ] Implement CORS properly
- [ ] Audit dependencies for vulnerabilities
  ```bash
  npm audit
  ```
- [ ] Remove development artifacts

### 8.9 Performance Optimization
- [ ] Run Lighthouse audit (target 90+ scores)
- [ ] Optimize images (WebP, lazy loading)
- [ ] Implement caching strategy:
  - [ ] Browser caching for static assets
  - [ ] API response caching
  - [ ] CDN caching
- [ ] Enable HTTP/2
- [ ] Minimize bundle size
- [ ] Test Core Web Vitals

### 8.10 Documentation
- [ ] Update README with:
  - [ ] Project description
  - [ ] Tech stack
  - [ ] Setup instructions
  - [ ] Development workflow
  - [ ] Deployment process
- [ ] Create CONTRIBUTING.md
- [ ] Document API endpoints
- [ ] Create user guide (if needed)
- [ ] Add license file

### 8.11 Launch Checklist
- [ ] All tests passing
- [ ] Production build successful
- [ ] Database migrated and seeded
- [ ] Environment variables configured
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring active
- [ ] Analytics working
- [ ] Backup system verified
- [ ] Error tracking configured
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete

### 8.12 Post-Launch
- [ ] Monitor error rates
- [ ] Watch performance metrics
- [ ] Gather initial user feedback
- [ ] Plan iteration based on feedback
- [ ] Set up regular maintenance schedule

---

## Playwright Tests - Sprint 8

### Test File: `tests/e2e/sprint-08/production-readiness.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sprint 8: Production Readiness', () => {

  const PROD_URL = process.env.PROD_URL || 'http://localhost:3000';

  // Health Check Tests
  test('API health check passes', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('frontend loads successfully', async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page).toHaveTitle(/AI Timeline/);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/production-homepage.png',
      fullPage: true
    });
  });

  // Performance Tests
  test('page load time is acceptable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  });

  test('Lighthouse performance score', async ({ page }) => {
    // Note: Full Lighthouse requires separate setup
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    // Basic performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        loaded: navigation.loadEventEnd - navigation.startTime,
      };
    });

    console.log('Performance metrics:', metrics);
    expect(metrics.domContentLoaded).toBeLessThan(3000);
  });

  // Security Header Tests
  test('security headers are present', async ({ request }) => {
    const response = await request.get(PROD_URL);
    const headers = response.headers();

    // Check for security headers
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBeDefined();
  });

  // SSL/HTTPS Tests (for production)
  test('redirects HTTP to HTTPS', async ({ request }) => {
    // Only test in production with real domain
    if (PROD_URL.startsWith('https://')) {
      const httpUrl = PROD_URL.replace('https://', 'http://');
      const response = await request.get(httpUrl, {
        followRedirects: false
      });
      expect(response.status()).toBe(301);
    }
  });

  // API Functionality Tests
  test('milestones API returns data', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/milestones`);
    expect(response.ok()).toBeTruthy();

    const milestones = await response.json();
    expect(Array.isArray(milestones)).toBeTruthy();
    expect(milestones.length).toBeGreaterThan(0);
  });

  // Error Handling Tests
  test('404 page displays correctly', async ({ page }) => {
    await page.goto(`${PROD_URL}/nonexistent-page-12345`);

    await expect(page.locator('[data-testid="not-found"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/404-page.png',
      fullPage: true
    });
  });

  test('API error returns proper format', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/milestones/nonexistent-id`);
    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error).toHaveProperty('message');
  });

  // Cross-browser Screenshots
  test('Chrome renders correctly', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome only');

    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/browser-chrome.png',
      fullPage: true
    });
  });

  test('Firefox renders correctly', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox only');

    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/browser-firefox.png',
      fullPage: true
    });
  });

  test('Safari renders correctly', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari only');

    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/browser-safari.png',
      fullPage: true
    });
  });

  // Mobile Device Screenshots
  test('iPhone renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/device-iphone.png',
      fullPage: true
    });
  });

  test('iPad renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/device-ipad.png',
      fullPage: true
    });
  });

  test('Android phone renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/device-android.png',
      fullPage: true
    });
  });

  // Full User Journey Test
  test('complete user journey works', async ({ page }) => {
    // 1. Load homepage
    await page.goto(PROD_URL);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/journey-1-home.png'
    });

    // 2. Navigate to timeline
    await page.click('a[href="/timeline"]');
    await page.waitForSelector('[data-testid="timeline-container"]');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/journey-2-timeline.png'
    });

    // 3. Search for something
    await page.fill('[data-testid="search-input"]', 'GPT');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/journey-3-search.png'
    });

    // 4. Click on a result
    const result = page.locator('[data-testid="search-result-item"]').first();
    if (await result.isVisible()) {
      await result.click();
      await page.waitForSelector('[data-testid="milestone-detail"]');
      await page.screenshot({
        path: 'tests/e2e/screenshots/sprint-08/journey-4-detail.png'
      });
    }

    // 5. Apply filter
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="filter-toggle"]').click();
    await page.locator('[data-testid="category-breakthrough"]').click();
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/journey-5-filtered.png'
    });
  });

  // Stress Test (basic)
  test('handles rapid navigation', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForSelector('[data-testid="timeline-container"]');

    // Rapid scroll
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    // Should still be responsive
    await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-08/stress-test.png',
      fullPage: true
    });
  });
});
```

### Screenshot Checklist
- [ ] `production-homepage.png` - Production home page
- [ ] `404-page.png` - Not found page
- [ ] `browser-chrome.png` - Chrome render
- [ ] `browser-firefox.png` - Firefox render
- [ ] `browser-safari.png` - Safari render
- [ ] `device-iphone.png` - iPhone view
- [ ] `device-ipad.png` - iPad view
- [ ] `device-android.png` - Android view
- [ ] `journey-1-home.png` to `journey-5-filtered.png` - User journey
- [ ] `stress-test.png` - After stress test

---

## Acceptance Criteria

- [ ] Production build completes without errors
- [ ] CI/CD pipeline passes all checks
- [ ] Frontend deployed and accessible
- [ ] Backend deployed and healthy
- [ ] Database migrated and seeded
- [ ] Monitoring and alerting active
- [ ] Analytics collecting data
- [ ] Security headers configured
- [ ] Performance benchmarks met
- [ ] Cross-browser testing passed
- [ ] Mobile testing passed
- [ ] Documentation complete
- [ ] All Playwright tests passing

---

## Launch Readiness Checklist

### Technical
- [ ] All sprints completed
- [ ] Zero critical bugs
- [ ] Performance targets met
- [ ] Security audit passed

### Operational
- [ ] Monitoring configured
- [ ] Backup system tested
- [ ] Incident response plan
- [ ] On-call schedule

### Content
- [ ] Initial milestones populated
- [ ] Data accuracy verified
- [ ] Images optimized

### Communication
- [ ] Launch announcement ready
- [ ] Social media prepared
- [ ] Stakeholders notified

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Production deployment successful
- [ ] Launch complete
- [ ] Post-launch monitoring active

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed

---

## Post-Launch Roadmap Ideas

Future enhancements to consider:
- [ ] User accounts and personalization
- [ ] Community-contributed milestones
- [ ] API for external integrations
- [ ] Data export features
- [ ] Embeddable timeline widget
- [ ] Mobile app (React Native)
- [ ] Timeline comparison views
- [ ] AI-powered milestone suggestions
