---
paths: apps/web/**/*.{ts,tsx,css}, packages/ui/**/*.{ts,tsx}
---

# Design System & UX Standards

## Design Principles

1. **Clarity over cleverness** - Information hierarchy is paramount
2. **Progressive disclosure** - Show overview first, details on demand
3. **Smooth transitions** - Animation guides attention, not distracts
4. **Touch-friendly** - Minimum 44px tap targets on mobile
5. **Accessible by default** - WCAG 2.1 AA compliance

## Color System

### Semantic Colors
```css
/* Light Mode */
--background: 0 0% 100%;           /* White */
--foreground: 222 47% 11%;         /* Near black */
--card: 0 0% 100%;
--card-foreground: 222 47% 11%;
--primary: 222 47% 31%;            /* Deep blue */
--primary-foreground: 0 0% 100%;
--secondary: 210 40% 96%;          /* Light gray-blue */
--secondary-foreground: 222 47% 11%;
--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;
--accent: 210 40% 96%;
--accent-foreground: 222 47% 11%;
--destructive: 0 84% 60%;          /* Red */
--border: 214 32% 91%;
--ring: 222 47% 31%;

/* Dark Mode */
--background: 222 47% 11%;
--foreground: 210 40% 98%;
/* ... inverted values */
```

### Era Colors
Each era has a distinct color for timeline bands:
```typescript
const eraColors = {
  foundations: '#6B7280',           // Gray
  birth_of_ai: '#8B5CF6',          // Purple
  symbolic_expert: '#3B82F6',       // Blue
  winters_statistical: '#10B981',   // Emerald
  deep_learning_resurgence: '#F59E0B', // Amber
  transformers_nlp: '#EF4444',      // Red
  scaling_llms: '#EC4899',          // Pink
  alignment_productization: '#8B5CF6', // Purple
  multimodal_deployment: '#06B6D4', // Cyan
}
```

## Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale
| Name | Size | Weight | Use |
|------|------|--------|-----|
| `text-xs` | 12px | 400 | Captions, labels |
| `text-sm` | 14px | 400 | Secondary text |
| `text-base` | 16px | 400 | Body text |
| `text-lg` | 18px | 500 | Emphasized body |
| `text-xl` | 20px | 600 | Card titles |
| `text-2xl` | 24px | 700 | Section headers |
| `text-3xl` | 30px | 700 | Page titles |
| `text-4xl` | 36px | 800 | Hero text |

## Spacing System

Use Tailwind's spacing scale consistently:
- `gap-1` (4px): Tight inline elements
- `gap-2` (8px): Related elements
- `gap-4` (16px): Standard spacing
- `gap-6` (24px): Section padding
- `gap-8` (32px): Major sections

## Component Patterns

### Cards
```tsx
<Card className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="pb-2">
    <CardTitle className="text-lg font-semibold">{title}</CardTitle>
  </CardHeader>
  <CardContent>
    {content}
  </CardContent>
</Card>
```

### Event Card (Timeline)
```tsx
<motion.div
  className={cn(
    "relative rounded-lg border p-4 cursor-pointer",
    "hover:border-primary/50 hover:shadow-md transition-all",
    isSelected && "border-primary ring-2 ring-primary/20"
  )}
  whileHover={{ y: -2 }}
  onClick={() => onSelect(event.id)}
>
  <div className="flex items-start gap-3">
    <div
      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
      style={{ backgroundColor: eraColors[event.era] }}
    />
    <div className="flex-1 min-w-0">
      <time className="text-xs text-muted-foreground">{formatDate(event.date_start)}</time>
      <h3 className="font-medium text-sm leading-tight mt-0.5">{event.title}</h3>
    </div>
  </div>
</motion.div>
```

### Concept Tooltip
```tsx
<TooltipProvider>
  <Tooltip delayDuration={200}>
    <TooltipTrigger asChild>
      <button className="font-semibold text-primary hover:underline underline-offset-2">
        {concept.name}
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p className="text-sm">{concept.short_definition}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Citation Drawer
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm" className="gap-2">
      <BookOpen className="h-4 w-4" />
      Sources ({citations.length})
    </Button>
  </SheetTrigger>
  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Sources</SheetTitle>
    </SheetHeader>
    <div className="mt-6 space-y-4">
      {citations.map((citation) => (
        <CitationCard key={citation.id} citation={citation} />
      ))}
    </div>
  </SheetContent>
</Sheet>
```

## Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Large phones, small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Layout Patterns

#### Timeline View
```tsx
{/* Mobile: Vertical list */}
<div className="block lg:hidden">
  <VerticalTimeline events={events} />
</div>

{/* Desktop: Horizontal canvas */}
<div className="hidden lg:block h-[600px]">
  <TimelineCanvas events={events} />
</div>
```

#### Event Detail Panel
```tsx
{/* Mobile: Bottom sheet */}
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="bottom" className="h-[85vh] lg:hidden">
    <EventDetail event={selectedEvent} />
  </SheetContent>
</Sheet>

{/* Desktop: Side panel */}
<div className="hidden lg:block w-[400px] border-l">
  <EventDetail event={selectedEvent} />
</div>
```

## Animation Guidelines

### Timing
- **Fast**: 150ms - Micro-interactions (hover, focus)
- **Normal**: 200-300ms - Panel transitions, tooltips
- **Slow**: 400-500ms - Page transitions, modals

### Easing
```typescript
const easings = {
  easeOut: [0, 0, 0.2, 1],      // Entering elements
  easeIn: [0.4, 0, 1, 1],       // Exiting elements
  easeInOut: [0.4, 0, 0.2, 1],  // Moving elements
}
```

### Motion Patterns
```tsx
// Fade + slide up (entering panels)
const enterFromBottom = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.2 }
}

// Scale + fade (tooltips, popovers)
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 }
}
```

## Accessibility

### Requirements
- All interactive elements keyboard accessible
- Focus indicators visible (use `ring` utilities)
- Minimum contrast ratio 4.5:1 for text
- `aria-label` on icon-only buttons
- `alt` text on all images
- Reduced motion support with `prefers-reduced-motion`

### Focus States
```tsx
<button className={cn(
  "rounded-lg px-4 py-2",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
)}>
```

### Reduced Motion
```tsx
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
>
```

## Icons

Use Lucide React icons consistently:
```tsx
import { Calendar, BookOpen, User, Building2, Search, Filter, ChevronRight } from 'lucide-react'

// Standard sizes
<Calendar className="h-4 w-4" />  // Inline with text
<Calendar className="h-5 w-5" />  // Buttons
<Calendar className="h-6 w-6" />  // Headers
```
