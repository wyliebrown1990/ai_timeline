---
paths: apps/web/**/*.{ts,tsx}, packages/ui/**/*.{ts,tsx}
---

# Frontend Development Rules

## Next.js App Router

- Use App Router (`app/`) exclusively, not Pages Router
- Prefer Server Components by default; add `'use client'` only when needed
- Use `layout.tsx` for shared layouts, `page.tsx` for route entry points
- Implement loading states with `loading.tsx` and error boundaries with `error.tsx`
- Use `generateMetadata` for dynamic SEO metadata

## React Components

### Component Structure
```tsx
// 1. Imports (external → internal → types → styles)
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Event } from '@/types'

// 2. Types/Interfaces
interface EventCardProps {
  event: Event
  isSelected?: boolean
  onSelect: (id: string) => void
}

// 3. Component (named export)
export function EventCard({ event, isSelected = false, onSelect }: EventCardProps) {
  // hooks first
  const [isHovered, setIsHovered] = useState(false)

  // handlers
  const handleClick = () => onSelect(event.id)

  // render
  return (...)
}
```

### Component Guidelines
- One component per file, filename matches component name
- Extract reusable logic into custom hooks in `lib/hooks/`
- Keep components under 150 lines; extract sub-components when larger
- Use composition over prop drilling
- Memoize expensive computations with `useMemo`, callbacks with `useCallback`

## State Management

### Server State (React Query)
```tsx
// Use React Query for all server data
const { data: events, isLoading, error } = useQuery({
  queryKey: ['events', filters],
  queryFn: () => fetchEvents(filters),
})
```

### Client State (Zustand)
```tsx
// For UI state: selected event, zoom level, filters
import { create } from 'zustand'

interface TimelineStore {
  selectedEventId: string | null
  zoomLevel: 'decade' | 'year' | 'month'
  setSelectedEvent: (id: string | null) => void
  setZoomLevel: (level: 'decade' | 'year' | 'month') => void
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  selectedEventId: null,
  zoomLevel: 'year',
  setSelectedEvent: (id) => set({ selectedEventId: id }),
  setZoomLevel: (level) => set({ zoomLevel: level }),
}))
```

## Styling with Tailwind + shadcn/ui

- Use Tailwind utility classes; avoid custom CSS when possible
- Use `cn()` helper for conditional classes
- Follow shadcn/ui patterns for component variants
- Mobile-first: start with base styles, add `sm:`, `md:`, `lg:` for larger screens

```tsx
// Good: Mobile-first responsive
<div className="flex flex-col gap-4 md:flex-row md:gap-8">

// Use cn() for conditionals
<button className={cn(
  "px-4 py-2 rounded-lg transition-colors",
  isActive && "bg-primary text-primary-foreground",
  !isActive && "bg-muted hover:bg-muted/80"
)}>
```

## Animation with Framer Motion

- Use `motion` components for animated elements
- Prefer `layoutId` for shared element transitions
- Use `AnimatePresence` for exit animations
- Keep animations subtle and purposeful (200-300ms duration)

```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

## Timeline Visualization (visx/D3)

- Use visx for React-friendly D3 patterns
- Implement semantic zoom with `@visx/zoom`
- Handle event clustering at low zoom levels
- Ensure touch support for mobile pan/zoom
- Render timeline in a canvas or SVG based on event density

## TypeScript

- Enable strict mode in `tsconfig.json`
- Define explicit return types for functions
- Use `satisfies` operator for type validation with inference
- Avoid `any`; use `unknown` with type guards when needed
- Import types with `import type` for better tree-shaking

## Performance

- Virtualize long lists with `@tanstack/react-virtual`
- Lazy load components below the fold with `dynamic()`
- Optimize images with `next/image`
- Use `Suspense` boundaries for code splitting
- Profile with React DevTools before optimizing
