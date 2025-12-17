---
paths: **/*.test.{ts,tsx}, **/*.spec.{ts,tsx}, **/tests/**/*
---

# Testing Conventions

## Testing Stack

- **Unit/Integration**: Vitest
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **Visual Regression**: Playwright screenshots (optional)

## Test File Organization

```
apps/web/
├── components/
│   ├── EventCard.tsx
│   └── EventCard.test.tsx       # Co-located unit tests
├── lib/
│   ├── formatDate.ts
│   └── formatDate.test.ts
└── tests/
    └── e2e/
        ├── timeline.spec.ts     # E2E tests
        └── search.spec.ts
```

## Unit Tests (Vitest)

### Utility Functions
```typescript
// lib/formatDate.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatDateRange } from './formatDate'

describe('formatDate', () => {
  it('formats full date correctly', () => {
    expect(formatDate('2017-06-12')).toBe('June 12, 2017')
  })

  it('formats year-month correctly', () => {
    expect(formatDate('2017-06')).toBe('June 2017')
  })

  it('formats year-only correctly', () => {
    expect(formatDate('2017')).toBe('2017')
  })
})

describe('formatDateRange', () => {
  it('shows single date when no end date', () => {
    expect(formatDateRange('2017-06-12', undefined)).toBe('June 12, 2017')
  })

  it('shows range when both dates provided', () => {
    expect(formatDateRange('2017-06-12', '2017-06-14')).toBe('June 12–14, 2017')
  })
})
```

### Schema Validation
```typescript
// schemas/event.test.ts
import { describe, it, expect } from 'vitest'
import { EventSchema } from './event'

describe('EventSchema', () => {
  it('accepts valid event', () => {
    const validEvent = {
      id: 'E2017_TRANSFORMER',
      title: 'Transformer architecture introduced',
      date_start: '2017-06-12',
      era: 'transformers_nlp',
      event_type: 'paper',
      summary_md: 'The Transformer architecture revolutionized NLP...',
      citations: [{
        source_url: 'https://arxiv.org/abs/1706.03762',
        source_title: 'Attention Is All You Need',
        kind: 'paper',
        is_primary: true,
      }],
    }
    expect(() => EventSchema.parse(validEvent)).not.toThrow()
  })

  it('rejects event without citations', () => {
    const invalidEvent = {
      id: 'E2017_TEST',
      title: 'Test event',
      date_start: '2017',
      era: 'transformers_nlp',
      event_type: 'paper',
      summary_md: 'A test event...',
      citations: [],
    }
    expect(() => EventSchema.parse(invalidEvent)).toThrow()
  })
})
```

## Component Tests (React Testing Library)

### Principles
- Test behavior, not implementation
- Use accessible queries (role, label, text)
- Avoid testing internal state directly

```typescript
// components/EventCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventCard } from './EventCard'

const mockEvent = {
  id: 'E2017_TRANSFORMER',
  title: 'Transformer architecture introduced',
  date_start: '2017-06-12',
  era: 'transformers_nlp',
  summary_md: 'The Transformer...',
}

describe('EventCard', () => {
  it('renders event title and date', () => {
    render(<EventCard event={mockEvent} onSelect={vi.fn()} />)

    expect(screen.getByText('Transformer architecture introduced')).toBeInTheDocument()
    expect(screen.getByText('June 12, 2017')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<EventCard event={mockEvent} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledWith('E2017_TRANSFORMER')
  })

  it('shows selected state', () => {
    render(<EventCard event={mockEvent} isSelected={true} onSelect={vi.fn()} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true')
  })
})
```

### Testing Hooks
```typescript
// lib/hooks/useTimeline.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useTimelineStore } from './useTimeline'

describe('useTimelineStore', () => {
  it('updates zoom level', () => {
    const { result } = renderHook(() => useTimelineStore())

    expect(result.current.zoomLevel).toBe('year')

    act(() => {
      result.current.setZoomLevel('month')
    })

    expect(result.current.zoomLevel).toBe('month')
  })
})
```

## E2E Tests (Playwright)

### Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
})
```

### E2E Test Examples
```typescript
// tests/e2e/timeline.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays guided start events', async ({ page }) => {
    await expect(page.getByText('Transformer architecture')).toBeVisible()
    await expect(page.getByText('GPT-3')).toBeVisible()
    await expect(page.getByText('ChatGPT')).toBeVisible()
    await expect(page.getByText('GPT-4')).toBeVisible()
  })

  test('opens event detail when clicked', async ({ page }) => {
    await page.getByText('Transformer architecture').click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Attention Is All You Need')).toBeVisible()
  })

  test('filters events by category', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByLabel('Research').click()

    // Verify only research events shown
    await expect(page.getByText('paper')).toHaveCount(await page.locator('[data-event-type="paper"]').count())
  })
})

test.describe('Search', () => {
  test('finds events by keyword', async ({ page }) => {
    await page.goto('/')

    await page.getByPlaceholder('Search events').fill('Transformer')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Transformer architecture')).toBeVisible()
  })
})
```

### Mobile Testing
```typescript
// tests/e2e/mobile.spec.ts
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } }) // iPhone 12

test.describe('Mobile Timeline', () => {
  test('shows vertical timeline on mobile', async ({ page }) => {
    await page.goto('/')

    // Horizontal canvas should be hidden
    await expect(page.locator('[data-testid="timeline-canvas"]')).not.toBeVisible()

    // Vertical list should be visible
    await expect(page.locator('[data-testid="timeline-list"]')).toBeVisible()
  })

  test('opens event in bottom sheet', async ({ page }) => {
    await page.goto('/')

    await page.getByText('Transformer architecture').click()

    // Bottom sheet should slide up
    await expect(page.locator('[data-testid="event-sheet"]')).toBeVisible()
  })
})
```

## Test Data

### Fixtures
```typescript
// tests/fixtures/events.ts
export const mockEvents = [
  {
    id: 'E2017_TRANSFORMER',
    title: 'Transformer architecture introduced',
    date_start: '2017-06-12',
    era: 'transformers_nlp',
    event_type: 'paper',
    summary_md: 'The [[Transformer]] architecture...',
    is_guided_start: true,
    citations: [
      {
        source_url: 'https://arxiv.org/abs/1706.03762',
        source_title: 'Attention Is All You Need',
        kind: 'paper',
        is_primary: true,
      },
    ],
  },
  // ... more events
]
```

### MSW for API Mocking
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { mockEvents } from '../fixtures/events'

export const handlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ data: mockEvents })
  }),

  http.get('/api/events/:id', ({ params }) => {
    const event = mockEvents.find(e => e.id === params.id)
    if (!event) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ data: event })
  }),
]
```

## Coverage Requirements

- **Minimum coverage**: 70% overall
- **Critical paths**: 90%+ (search, timeline navigation, event display)
- **Schemas**: 100% validation tests
- **Utilities**: 100% for date/format functions

## CI Integration

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'pnpm'
    - run: pnpm install
    - run: pnpm test:unit
    - run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```
