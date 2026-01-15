# Frontend Rules

Vite + React + TypeScript + Tailwind CSS

## Component Structure
```tsx
// 1. Imports (external → internal → types)
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Person } from '@/types';

// 2. Props interface
interface PersonCardProps {
  person: Person;
  onClick?: () => void;
}

// 3. Named export
export function PersonCard({ person, onClick }: PersonCardProps) {
  return (...);
}
```

## Routing
React Router v6 with route config in `src/App.tsx`:
```tsx
<Routes>
  <Route path="/" element={<TimelinePage />} />
  <Route path="/people/:slug" element={<PersonProfilePage />} />
  <Route path="/organizations/:slug" element={<OrganizationProfilePage />} />
  <Route path="/admin/*" element={<AdminLayout />}>
    <Route index element={<AdminDashboard />} />
    <Route path="review" element={<ReviewQueuePage />} />
  </Route>
</Routes>
```

## State Management
- **Server state**: React Query via custom hooks in `src/hooks/`
- **UI state**: React useState/useContext
- **Forms**: Controlled components with local state

## API Calls
Use API clients in `src/services/api.ts`:
```tsx
import { personsApi, organizationsApi, milestonesApi } from '@/services/api';

const { data } = await personsApi.getBySlug(slug);
```

## Styling
- Tailwind utility classes
- `cn()` helper for conditional classes
- Mobile-first responsive (`sm:`, `md:`, `lg:`)

## Key Patterns

### Modals
```tsx
<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
    {content}
  </div>
</div>
```

### Tooltips/Hover Cards
Use React Portal to escape stacking contexts:
```tsx
{createPortal(
  <div style={{ position: 'fixed', top: y, left: x }}>
    {tooltip}
  </div>,
  document.body
)}
```

### Loading States
```tsx
if (isLoading) return <Skeleton className="h-48 w-full" />;
if (error) return <ErrorState message={error.message} />;
```

## File Organization
```
src/
├── components/
│   ├── Timeline/       # Timeline-specific
│   ├── admin/          # Admin components
│   └── ui/             # Reusable UI (buttons, cards)
├── pages/
│   ├── admin/          # Admin pages
│   ├── PersonProfilePage.tsx
│   └── OrganizationProfilePage.tsx
├── services/
│   └── api.ts          # All API clients
└── types/
    ├── person.ts
    └── organization.ts
```
