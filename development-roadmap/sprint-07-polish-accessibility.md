# Sprint 7: Polish & Accessibility

## Sprint Goal
Refine the user experience with animations, theming, and comprehensive accessibility support.

---

## Prerequisites
- [ ] Sprint 6 completed
- [ ] All core features functional
- [ ] Design system established

---

## Tasks

### 7.1 Theme System Implementation
- [ ] Create theme context
  ```typescript
  // src/context/ThemeContext.tsx
  interface Theme {
    mode: 'light' | 'dark' | 'system';
    colors: ThemeColors;
  }

  interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textMuted: string;
    border: string;
    // ... category colors
  }
  ```
- [ ] Define light theme colors
- [ ] Define dark theme colors
- [ ] Implement system preference detection
- [ ] Create theme toggle component
- [ ] Persist theme preference to localStorage
- [ ] Apply theme to all components

### 7.2 Dark Mode Styling
- [ ] Update Tailwind config for dark mode
  ```javascript
  // tailwind.config.js
  module.exports = {
    darkMode: 'class',
    // ...
  }
  ```
- [ ] Audit all components for dark mode:
  - [ ] Header/Navigation
  - [ ] Timeline container
  - [ ] Milestone cards
  - [ ] Detail panel/modal
  - [ ] Filter panel
  - [ ] Search components
  - [ ] Admin pages
  - [ ] Forms and inputs
  - [ ] Buttons and controls
- [ ] Ensure category colors work in both themes
- [ ] Update images/icons for dark mode

### 7.3 Animation & Micro-interactions
- [ ] Create animation utilities
  ```typescript
  // src/utils/animations.ts
  export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  export const slideInRight = {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 }
  };
  ```
- [ ] Add animations to:
  - [ ] Page transitions
  - [ ] Modal/panel open/close
  - [ ] List item appearance
  - [ ] Button hover states
  - [ ] Loading skeletons
  - [ ] Toast notifications
  - [ ] Scroll reveals
- [ ] Create smooth scroll behavior
- [ ] Add hover effects to interactive elements
- [ ] Implement focus transitions

### 7.4 Accessibility Audit & Fixes
- [ ] Run automated accessibility tools:
  ```bash
  npm install -D @axe-core/playwright
  ```
- [ ] Fix color contrast issues (WCAG AA)
- [ ] Ensure all images have alt text
- [ ] Add ARIA labels to interactive elements
- [ ] Implement proper heading hierarchy
- [ ] Add skip navigation link
- [ ] Ensure forms have proper labels
- [ ] Test with screen reader (VoiceOver/NVDA)

### 7.5 Keyboard Accessibility
- [ ] Audit all interactive elements for focus
- [ ] Create visible focus indicators
  ```css
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  ```
- [ ] Implement focus trap in modals
- [ ] Ensure logical tab order
- [ ] Add roving tabindex for lists
- [ ] Test full keyboard navigation flow

### 7.6 Screen Reader Support
- [ ] Add ARIA landmarks
  ```html
  <header role="banner">
  <nav role="navigation">
  <main role="main">
  <footer role="contentinfo">
  ```
- [ ] Implement live regions for updates
  ```html
  <div role="status" aria-live="polite">
    {/* Dynamic content */}
  </div>
  ```
- [ ] Add descriptive ARIA labels
- [ ] Announce filter/search results
- [ ] Test with screen reader

### 7.7 Reduced Motion Support
- [ ] Detect `prefers-reduced-motion`
- [ ] Create reduced motion variants
  ```typescript
  // src/hooks/useReducedMotion.ts
  export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      // ... listener
    }, []);

    return reducedMotion;
  }
  ```
- [ ] Apply simpler animations when enabled
- [ ] Test with reduced motion setting

### 7.8 Loading States & Feedback
- [ ] Create consistent loading skeletons
- [ ] Add loading indicators to buttons
- [ ] Implement progress indicators for long operations
- [ ] Add error state components
- [ ] Create empty state designs
- [ ] Ensure all states are accessible

### 7.9 Typography & Readability
- [ ] Audit font sizes (min 16px body)
- [ ] Check line heights (1.5 for body text)
- [ ] Ensure sufficient line lengths
- [ ] Add font scaling support
- [ ] Test with browser zoom (up to 200%)
- [ ] Implement responsive typography

### 7.10 Performance Polish
- [ ] Lazy load off-screen milestones
- [ ] Implement image lazy loading
- [ ] Add loading="lazy" to images
- [ ] Optimize bundle size
- [ ] Add service worker for caching
- [ ] Measure and improve Core Web Vitals

---

## Playwright Tests - Sprint 7

### Test File: `tests/e2e/sprint-07/polish-accessibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sprint 7: Polish & Accessibility', () => {

  // Theme Tests
  test('light theme displays correctly', async ({ page }) => {
    await page.goto('/timeline');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-light.png',
      fullPage: true
    });
  });

  test('dark theme displays correctly', async ({ page }) => {
    await page.goto('/timeline');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-dark.png',
      fullPage: true
    });
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/timeline');

    // Find and click theme toggle
    await page.locator('[data-testid="theme-toggle"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/theme-toggled.png',
      fullPage: true
    });
  });

  test('theme persists on refresh', async ({ page }) => {
    await page.goto('/timeline');

    // Set dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });

    // Refresh
    await page.reload();
    await page.waitForSelector('[data-testid="timeline-container"]');

    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();
  });

  // Animation Tests
  test('animations play on page load', async ({ page }) => {
    await page.goto('/timeline');

    // Capture animation frames
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(200);
      await page.screenshot({
        path: `tests/e2e/screenshots/sprint-07/animation-frame-${i}.png`
      });
    }
  });

  test('modal animation works', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForTimeout(100);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/modal-animation.png',
      fullPage: true
    });
  });

  test('reduced motion respects preference', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/reduced-motion.png',
      fullPage: true
    });
  });

  // Accessibility Tests
  test('page has no accessibility violations', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    const results = await new AxeBuilder({ page }).analyze();

    // Save violations for review
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toHaveLength(0);
  });

  test('admin page has no accessibility violations', async ({ page }) => {
    await page.goto('/admin/milestones');
    await page.waitForSelector('[data-testid="admin-milestones-list"]');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );
    expect(contrastViolations).toHaveLength(0);
  });

  // Keyboard Navigation Tests
  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/focus-indicator.png',
      fullPage: true
    });
  });

  test('skip navigation link works', async ({ page }) => {
    await page.goto('/timeline');

    // Focus skip link (usually first focusable element)
    await page.keyboard.press('Tab');

    const skipLink = page.locator('[data-testid="skip-nav"]');
    if (await skipLink.isVisible()) {
      await skipLink.screenshot({
        path: 'tests/e2e/screenshots/sprint-07/skip-nav-link.png'
      });

      await page.keyboard.press('Enter');
      // Should focus main content
    }
  });

  test('modal traps focus', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    await page.locator('[data-testid="milestone-card"]').first().click();
    await page.waitForSelector('[data-testid="milestone-detail"]');

    // Tab through modal - should cycle within modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Focus should still be in modal
    const focused = await page.evaluate(() => {
      return document.activeElement?.closest('[data-testid="milestone-detail"]') !== null;
    });
    expect(focused).toBeTruthy();
  });

  // Screen Reader Tests
  test('ARIA landmarks are present', async ({ page }) => {
    await page.goto('/timeline');

    await expect(page.locator('[role="banner"]')).toBeVisible();
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="timeline-container"]');

    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  // Browser Zoom Tests
  test('200% zoom is usable', async ({ page }) => {
    await page.goto('/timeline');

    // Simulate 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/zoom-200.png',
      fullPage: true
    });
  });

  // Loading States
  test('loading skeleton displays', async ({ page }) => {
    await page.route('/api/milestones', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/timeline');
    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/loading-skeleton.png',
      fullPage: true
    });
  });

  test('error state displays', async ({ page }) => {
    await page.route('/api/milestones', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="error-state"]');

    await page.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/error-state.png',
      fullPage: true
    });
  });

  // Component Polish Screenshots
  test('milestone card hover state', async ({ page }) => {
    await page.goto('/timeline');
    await page.waitForSelector('[data-testid="milestone-card"]');

    const card = page.locator('[data-testid="milestone-card"]').first();
    await card.hover();
    await page.waitForTimeout(300);

    await card.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/card-hover-polished.png'
    });
  });

  test('button states', async ({ page }) => {
    await page.goto('/admin/milestones/new');
    await page.waitForSelector('[data-testid="submit-btn"]');

    const btn = page.locator('[data-testid="submit-btn"]');

    // Normal state
    await btn.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/button-normal.png'
    });

    // Hover state
    await btn.hover();
    await page.waitForTimeout(150);
    await btn.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/button-hover.png'
    });

    // Focus state
    await btn.focus();
    await btn.screenshot({
      path: 'tests/e2e/screenshots/sprint-07/button-focus.png'
    });
  });
});
```

### Screenshot Checklist
- [ ] `theme-light.png` - Light theme full page
- [ ] `theme-dark.png` - Dark theme full page
- [ ] `theme-toggled.png` - After toggle
- [ ] `animation-frame-0.png` to `animation-frame-2.png` - Animation sequence
- [ ] `modal-animation.png` - Modal opening
- [ ] `reduced-motion.png` - With reduced motion
- [ ] `focus-indicator.png` - Focus ring visibility
- [ ] `skip-nav-link.png` - Skip navigation
- [ ] `zoom-200.png` - 200% browser zoom
- [ ] `loading-skeleton.png` - Loading state
- [ ] `error-state.png` - Error display
- [ ] `card-hover-polished.png` - Refined hover effect
- [ ] `button-normal.png` - Button default
- [ ] `button-hover.png` - Button hover
- [ ] `button-focus.png` - Button focus

---

## Acceptance Criteria

- [ ] Light and dark themes fully implemented
- [ ] Theme toggle works and persists
- [ ] Animations enhance user experience
- [ ] Reduced motion preference respected
- [ ] Zero accessibility violations (axe-core)
- [ ] WCAG AA color contrast met
- [ ] Full keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Page works at 200% zoom
- [ ] All Playwright tests passing

---

## Sprint Completion

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Merged to main branch
- [ ] Sprint retrospective completed

**Sprint Status:** [ ] Not Started / [ ] In Progress / [ ] Completed
