# Sprint 34: Performance Optimization (FCP & LCP)

**Impact**: High | **Effort**: Medium | **Dependencies**: None (can run in parallel with other work)

## Overview

Improve Google Lighthouse FCP (First Contentful Paint) and LCP (Largest Contentful Paint) scores through code splitting, caching, and resource optimization. Current main bundle is 434 KB with 572 KB of content data bundled eagerly regardless of route.

**Goal**: Reduce initial bundle size by 60%+, achieve "Good" Lighthouse scores for FCP and LCP.

---

## Current State Analysis

| Metric | Current | Target |
|--------|---------|--------|
| Main JS bundle | 434 KB (gzipped) | <150 KB |
| Content data bundled | 572 KB | ~50 KB (lazy-load rest) |
| Routes with lazy loading | 1 of 11+ | 11+ |
| Cache headers on assets | None | 1 year for hashed assets |
| Preload/prefetch hints | 0 | 4-6 critical resources |
| Render-blocking CSS | 12 KB | Inline critical, defer rest |

**Critical Request Chain (920ms):**
```
HTML → JS (729ms) → milestones/index.json (920ms)
```

---

## Phase 1: Quick Wins

### 34.1 Configure CloudFront Cache Headers
- [ ] Update CloudFront distribution cache behavior for static assets
- [ ] Set `Cache-Control: max-age=31536000, immutable` for hashed assets (`/assets/*`)
- [ ] Set `Cache-Control: max-age=3600` for HTML files (1 hour)
- [ ] Set `Cache-Control: max-age=86400` for data files (`/data/*`)

**Option A: CloudFront Cache Policy (Recommended)**
```bash
# Create custom cache policy via AWS Console or CLI
aws cloudfront create-cache-policy --cache-policy-config '{
  "Name": "ai-timeline-static-assets",
  "DefaultTTL": 31536000,
  "MaxTTL": 31536000,
  "MinTTL": 31536000,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": { "HeaderBehavior": "none" },
    "CookiesConfig": { "CookieBehavior": "none" },
    "QueryStringsConfig": { "QueryStringBehavior": "none" }
  }
}'

# Apply to /assets/* path pattern in distribution
```

**Option B: S3 Metadata (Alternative)**
```bash
# Set cache headers when uploading to S3
aws s3 sync dist/assets/ s3://ai-timeline-frontend-1765916222/assets/ \
  --cache-control "max-age=31536000, immutable" \
  --delete
```

- [ ] Invalidate CloudFront cache after updating policy
- [ ] Verify headers with: `curl -I https://letaiexplainai.com/assets/index-*.js`

### 34.2 Add Preload Hints to index.html
- [ ] Add preload for critical JavaScript
- [ ] Add preload for critical CSS
- [ ] Add preload for LCP image (if applicable)
- [ ] Add preconnect for API domain

```html
<!-- Add to <head> in index.html -->
<link rel="preconnect" href="https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com">
<link rel="preload" href="/assets/index-DVxMUOmA.js" as="script" crossorigin>
<link rel="preload" href="/assets/index-CnOOzmv3.css" as="style">
<link rel="preload" href="/ai-logo-animated.svg" as="image">
```

**Note**: Vite generates hashed filenames. Use Vite plugin or build script to inject correct paths:

```typescript
// vite.config.ts - Add plugin to inject preload hints
import { defineConfig, Plugin } from 'vite'

function preloadPlugin(): Plugin {
  return {
    name: 'preload-plugin',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html

      const jsEntry = Object.keys(ctx.bundle).find(
        k => k.startsWith('assets/index-') && k.endsWith('.js')
      )
      const cssEntry = Object.keys(ctx.bundle).find(
        k => k.startsWith('assets/index-') && k.endsWith('.css')
      )

      const preloads = [
        jsEntry && `<link rel="preload" href="/${jsEntry}" as="script" crossorigin>`,
        cssEntry && `<link rel="preload" href="/${cssEntry}" as="style">`,
        `<link rel="preconnect" href="https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com">`,
      ].filter(Boolean).join('\n    ')

      return html.replace('</head>', `    ${preloads}\n  </head>`)
    }
  }
}
```

### 34.3 Inline Critical CSS
- [ ] Identify above-the-fold CSS for homepage/timeline (~2-3 KB)
- [ ] Extract critical CSS using `critical` or `critters` package
- [ ] Inline critical CSS in `<head>`
- [ ] Defer full stylesheet loading

**Option A: Critters Vite Plugin (Automatic)**
```bash
npm install --save-dev critters
```

```typescript
// vite.config.ts
import critters from 'critters'

export default defineConfig({
  plugins: [
    // ... existing plugins
    {
      name: 'critters',
      async transformIndexHtml(html) {
        const critter = new critters({
          preload: 'swap',
          inlineFonts: false,
        })
        return await critter.process(html)
      }
    }
  ]
})
```

**Option B: Manual Critical CSS**
- [ ] Extract CSS for: header, hero section, initial timeline view
- [ ] Inline in `<style>` tag in `<head>`
- [ ] Add `media="print" onload="this.media='all'"` to defer main stylesheet

---

## Phase 2: Route-Based Code Splitting

### 34.4 Split Admin Pages (~150 KB savings)
- [ ] Convert all admin page imports to React.lazy()
- [ ] Add Suspense boundaries with loading fallback
- [ ] Verify admin chunk is only loaded when accessing `/admin/*`

```typescript
// src/App.tsx - BEFORE
import AdminDashboard from './pages/admin/AdminDashboard'
import MilestonesListPage from './pages/admin/MilestonesListPage'
import CreateMilestonePage from './pages/admin/CreateMilestonePage'
import EditMilestonePage from './pages/admin/EditMilestonePage'
import SourcesPage from './pages/admin/SourcesPage'
import IngestedArticlesPage from './pages/admin/IngestedArticlesPage'
import ArticleDetailPage from './pages/admin/ArticleDetailPage'
import ReviewQueuePage from './pages/admin/ReviewQueuePage'
import GlossaryAdminPage from './pages/admin/GlossaryAdminPage'
import LoginPage from './pages/admin/LoginPage'

// src/App.tsx - AFTER
import { lazy, Suspense } from 'react'

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const MilestonesListPage = lazy(() => import('./pages/admin/MilestonesListPage'))
const CreateMilestonePage = lazy(() => import('./pages/admin/CreateMilestonePage'))
const EditMilestonePage = lazy(() => import('./pages/admin/EditMilestonePage'))
const SourcesPage = lazy(() => import('./pages/admin/SourcesPage'))
const IngestedArticlesPage = lazy(() => import('./pages/admin/IngestedArticlesPage'))
const ArticleDetailPage = lazy(() => import('./pages/admin/ArticleDetailPage'))
const ReviewQueuePage = lazy(() => import('./pages/admin/ReviewQueuePage'))
const GlossaryAdminPage = lazy(() => import('./pages/admin/GlossaryAdminPage'))
const LoginPage = lazy(() => import('./pages/admin/LoginPage'))

// Wrap routes in Suspense
<Suspense fallback={<PageLoader />}>
  <Route path="/admin" element={<AdminDashboard />} />
  {/* ... other admin routes */}
</Suspense>
```

- [ ] Create `PageLoader` component for Suspense fallback:

```typescript
// src/components/PageLoader.tsx
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}
```

### 34.5 Split Study Pages (~200 KB savings)
- [ ] Convert study page imports to React.lazy()
- [ ] Includes: StudyPage, StudySessionPage, StudyStatsPage, PackDetailPage

```typescript
const StudyPage = lazy(() => import('./pages/StudyPage'))
const StudySessionPage = lazy(() => import('./pages/StudySessionPage'))
const StudyStatsPage = lazy(() => import('./pages/StudyStatsPage'))
const PackDetailPage = lazy(() => import('./pages/PackDetailPage'))
```

### 34.6 Split Secondary Feature Pages
- [ ] Convert remaining non-critical pages to lazy loading
- [ ] Pages: GlossaryPage, NewsPage, SettingsPage, LearningPathsPage

```typescript
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'))
```

### 34.7 Keep Critical Pages Eager
- [ ] HomePage and TimelinePage should remain eagerly loaded (entry points)
- [ ] These are the most common landing pages

```typescript
// Keep these as regular imports (not lazy)
import HomePage from './pages/HomePage'
import TimelinePage from './pages/TimelinePage'
```

---

## Phase 3: Content Loading Optimization

### 34.8 Audit Current Content Imports
- [ ] Review `src/content/index.ts` for all static imports
- [ ] Document which routes need which content files

**Current static imports (all bundled):**
| File | Size | Routes That Need It |
|------|------|---------------------|
| `layered-content.json` | 288 KB | Timeline |
| `glossary/terms.json` | 110 KB | Glossary (now from API) |
| `checkpoints/questions.json` | 58 KB | Checkpoints |
| `checkpoints/flashcards.json` | 11 KB | Study |
| `current-events/events.json` | 15 KB | News/Current Events |
| Learning paths (10 files) | 40 KB | Learn routes |

### 34.9 Convert Content to Dynamic Imports
- [ ] Create content loader utilities with caching
- [ ] Update content index to export async getters

```typescript
// src/content/index.ts - BEFORE
import layeredContentData from './milestones/layered-content.json'
import glossaryTermsData from './glossary/terms.json'
import checkpointQuestionsData from './checkpoints/questions.json'
// ... 10+ more imports

export const layeredContent = layeredContentData
export const glossaryTerms = glossaryTermsData

// src/content/index.ts - AFTER
// Cache for loaded content
const contentCache = new Map<string, unknown>()

async function loadContent<T>(key: string, loader: () => Promise<{ default: T }>): Promise<T> {
  if (contentCache.has(key)) {
    return contentCache.get(key) as T
  }
  const module = await loader()
  contentCache.set(key, module.default)
  return module.default
}

// Export async getters
export const getLayeredContent = () =>
  loadContent('layeredContent', () => import('./milestones/layered-content.json'))

export const getGlossaryTerms = () =>
  loadContent('glossaryTerms', () => import('./glossary/terms.json'))

export const getCheckpointQuestions = () =>
  loadContent('checkpointQuestions', () => import('./checkpoints/questions.json'))

export const getFlashcards = () =>
  loadContent('flashcards', () => import('./checkpoints/flashcards.json'))

export const getCurrentEvents = () =>
  loadContent('currentEvents', () => import('./current-events/events.json'))

// Learning paths - load individually
export const getLearningPath = (pathId: string) =>
  loadContent(`learningPath:${pathId}`, () => import(`./learning-paths/${pathId}.json`))
```

### 34.10 Update Components to Use Async Content
- [ ] Update TimelinePage to load layered content on mount
- [ ] Update GlossaryPage to use API (already migrated in Sprint 32)
- [ ] Update StudyPage to load flashcards on demand
- [ ] Update LearningPathsPage to load paths on demand
- [ ] Add loading states for content fetching

```typescript
// Example: TimelinePage update
import { useEffect, useState } from 'react'
import { getLayeredContent } from '@/content'
import type { LayeredContent } from '@/types'

export function TimelinePage() {
  const [content, setContent] = useState<LayeredContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLayeredContent()
      .then(setContent)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <TimelineSkeleton />
  }

  // ... rest of component
}
```

### 34.11 Create React Query Hooks for Content (Optional Enhancement)
- [ ] Install @tanstack/react-query if not already present
- [ ] Create content query hooks with caching
- [ ] Benefits: automatic caching, refetching, loading states

```typescript
// src/hooks/useContent.ts
import { useQuery } from '@tanstack/react-query'
import { getLayeredContent, getFlashcards } from '@/content'

export function useLayeredContent() {
  return useQuery({
    queryKey: ['layeredContent'],
    queryFn: getLayeredContent,
    staleTime: Infinity, // Content doesn't change during session
  })
}

export function useFlashcards() {
  return useQuery({
    queryKey: ['flashcards'],
    queryFn: getFlashcards,
    staleTime: Infinity,
  })
}
```

---

## Phase 4: Vite Build Optimization

### 34.12 Configure Manual Chunks
- [ ] Split vendor libraries into separate chunks
- [ ] Group related dependencies together
- [ ] Benefits: Better cache efficiency when updating app code

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Form handling - only needed on pages with forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // UI libraries
          'vendor-ui': ['@headlessui/react', '@heroicons/react', 'lucide-react'],

          // Date utilities
          'vendor-date': ['date-fns'],

          // Markdown rendering
          'vendor-markdown': ['react-markdown'],
        }
      }
    },
    // Increase chunk size warning limit (optional)
    chunkSizeWarningLimit: 500,
  }
})
```

### 34.13 Enable Build Analysis
- [ ] Add rollup-plugin-visualizer for bundle analysis
- [ ] Generate treemap visualization of bundle

```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ... other plugins
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ]
})
```

- [ ] Run `npm run build` and open `dist/stats.html` to analyze

### 34.14 Remove Source Maps from Production (Optional)
- [ ] Currently `sourcemap: true` adds 4MB to build output
- [ ] Consider disabling or using 'hidden' source maps

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false, // or 'hidden' to generate but not reference
  }
})
```

---

## Phase 5: LCP-Specific Optimizations

### 34.15 Identify and Optimize LCP Element
- [ ] Run Lighthouse to identify current LCP element
- [ ] Common LCP elements: hero text, main heading, hero image
- [ ] If LCP is `ai-logo-animated.svg`, add preload (done in 34.2)

### 34.16 Preload Critical Data
- [ ] If Timeline is a common landing page, preload milestones data
- [ ] Add `<link rel="preload">` for critical JSON

```html
<!-- For Timeline as landing page -->
<link rel="preload" href="/data/milestones/index.json" as="fetch" crossorigin>
```

### 34.17 Optimize SVG Logo
- [ ] Check if `ai-logo-animated.svg` can be simplified
- [ ] Consider inlining small SVGs directly in HTML
- [ ] If animation is complex, consider lazy-loading animation

```html
<!-- Option: Inline static SVG, lazy load animation -->
<svg id="logo" class="logo-static">
  <!-- Static version of logo -->
</svg>
<script>
  // Load animation after page is interactive
  requestIdleCallback(() => {
    import('/assets/logo-animation.js')
  })
</script>
```

### 34.18 Font Loading Optimization (If Applicable)
- [ ] Check if custom fonts are blocking render
- [ ] Add `font-display: swap` to font declarations
- [ ] Preload critical fonts

```css
/* In global CSS */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Prevent FOIT */
}
```

```html
<!-- Preload critical font -->
<link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2" crossorigin>
```

---

## Phase 6: Deployment & Verification

### 34.19 Update Deployment Script
- [ ] Add cache headers to S3 sync command
- [ ] Ensure proper content types are set

```bash
#!/bin/bash
# deploy-frontend.sh

# Build
npm run build

# Sync hashed assets with long cache
aws s3 sync dist/assets/ s3://ai-timeline-frontend-1765916222/assets/ \
  --cache-control "max-age=31536000, immutable" \
  --delete

# Sync HTML with short cache
aws s3 cp dist/index.html s3://ai-timeline-frontend-1765916222/index.html \
  --cache-control "max-age=3600"

# Sync other static files
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ \
  --exclude "assets/*" \
  --exclude "index.html" \
  --cache-control "max-age=86400" \
  --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E23Z9QNRPDI3HW \
  --paths "/*"
```

### 34.20 Verify Performance Improvements
- [ ] Run Lighthouse before and after each phase
- [ ] Document scores at each milestone
- [ ] Test on mobile (throttled connection)

**Verification Checklist:**
```bash
# Check cache headers
curl -I https://letaiexplainai.com/assets/index-*.js | grep cache-control

# Check bundle sizes
ls -la dist/assets/

# Check preload hints
curl https://letaiexplainai.com | grep -i preload

# Run Lighthouse (Chrome DevTools or CLI)
npx lighthouse https://letaiexplainai.com --view
```

### 34.21 Monitor Real User Metrics (Optional)
- [ ] Add Web Vitals tracking
- [ ] Report to analytics or CloudWatch

```typescript
// src/main.tsx
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: { name: string; value: number }) {
  // Send to your analytics service
  console.log(metric)
}

onCLS(sendToAnalytics)
onFCP(sendToAnalytics)
onLCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `vite.config.ts` | MODIFY | Add manual chunks, preload plugin, visualizer |
| `index.html` | MODIFY | Add preload/preconnect hints |
| `src/App.tsx` | MODIFY | Convert routes to React.lazy() |
| `src/content/index.ts` | REWRITE | Convert to async content loaders |
| `src/components/PageLoader.tsx` | NEW | Suspense fallback component |
| `src/pages/TimelinePage.tsx` | MODIFY | Use async content loading |
| `src/pages/StudyPage.tsx` | MODIFY | Use async content loading |
| `src/pages/LearningPathsPage.tsx` | MODIFY | Use async content loading |
| `deploy-frontend.sh` | NEW or MODIFY | Add cache headers to S3 sync |
| `package.json` | MODIFY | Add dev dependencies |

---

## Expected Results

| Metric | Before | After Phase 2 | After All Phases |
|--------|--------|---------------|------------------|
| **Main bundle** | 434 KB | ~250 KB | ~100 KB |
| **First load (homepage)** | 434 KB | ~150 KB | ~80 KB |
| **FCP score** | Poor | Fair | Good (green) |
| **LCP score** | Poor | Fair | Good (green) |
| **Repeat visit savings** | 0 | 447 KB | 447 KB |
| **Lighthouse Performance** | ~50 | ~70 | ~90 |

---

## Success Criteria

- [ ] Main bundle size reduced to <150 KB (gzipped)
- [ ] Admin pages load in separate chunk (not on public routes)
- [ ] Study pages load in separate chunk
- [ ] Content JSON files lazy-loaded per route
- [ ] CloudFront returns `Cache-Control: max-age=31536000` for assets
- [ ] Preload hints present in HTML for critical resources
- [ ] Lighthouse FCP score: Good (green, <1.8s)
- [ ] Lighthouse LCP score: Good (green, <2.5s)
- [ ] Lighthouse Performance score: >80
- [ ] No regressions in functionality

---

## Rollback Plan

If issues occur after deployment:

1. **Route splitting issues**:
   - Revert App.tsx to eager imports
   - Redeploy

2. **Content loading issues**:
   - Revert content/index.ts to static imports
   - Redeploy

3. **Cache issues**:
   - Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
   - Reduce cache TTL if needed

---

## Future Enhancements (Not This Sprint)

- [ ] Service Worker for offline caching
- [ ] HTTP/2 Server Push (if supported by CloudFront)
- [ ] Edge-side rendering for critical content
- [ ] Image optimization pipeline (if images are added)
- [ ] Brotli compression (CloudFront supports it)
- [ ] CSS code splitting per route
