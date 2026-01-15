# Sprint Subj-5: UI & Discovery

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-14 by Claude
>
> **STATUS: IN PROGRESS**

## Overview

Build the user-facing UI for subject-based content discovery. Add subject badges to content cards, subject filtering throughout the app, a subject discovery page, and subject-based recommendations.

## Prerequisites

- [x] Sprint Subj-1 through Subj-4 complete
- [x] Subject taxonomy populated (4 domains, 30+ subjects)
- [x] Most content has subject assignments (99% coverage - 324/326 items)
- [x] Subject APIs functional (content, stats, learning-path, cross-path, related)

---

## Tasks

### 1. Subject Badge Component

**File**: `src/components/ui/SubjectBadge.tsx` (new)

- [x] Create reusable subject badge component
  ```tsx
  interface SubjectBadgeProps {
    subject: Subject;
    size?: 'sm' | 'md' | 'lg';
    showDomain?: boolean;  // Show "Science > " prefix
    onClick?: () => void;
    className?: string;
  }

  export function SubjectBadge({
    subject,
    size = 'md',
    showDomain = false,
    onClick,
    className,
  }: SubjectBadgeProps) {
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center rounded-full font-medium transition-colors',
          sizeClasses[size],
          onClick && 'hover:opacity-80 cursor-pointer',
          className
        )}
        style={{
          backgroundColor: subject.color ? `${subject.color}20` : '#E5E7EB',
          color: subject.color || '#374151',
          borderColor: subject.color || '#D1D5DB',
        }}
      >
        {subject.icon && <span className="mr-1">{subject.icon}</span>}
        {showDomain && subject.level > 0 && (
          <span className="opacity-60 mr-1">{getDomainName(subject)} ›</span>
        )}
        {subject.name}
      </button>
    );
  }
  ```

- [x] Add hover tooltip showing full path
- [x] Support for grouped badges (show "+3 more")

### 2. Subject Badges on Content Cards

**File**: `src/components/Timeline/MilestoneCard.tsx`

- [ ] Fetch subjects for milestone
- [ ] Display primary subject badge
- [ ] Show "+N" indicator for additional subjects
- [ ] Click badge to filter timeline by that subject

```tsx
function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const { data: subjects } = useSubjectsForContent('milestone', milestone.id);
  const primarySubject = subjects?.find(s => s.isPrimary);
  const additionalCount = (subjects?.length || 0) - 1;

  return (
    <div className="...">
      {/* ... existing content ... */}

      {primarySubject && (
        <div className="mt-2 flex items-center gap-2">
          <SubjectBadge
            subject={primarySubject.subject}
            size="sm"
            onClick={() => navigate(`/?subject=${primarySubject.subject.slug}`)}
          />
          {additionalCount > 0 && (
            <span className="text-xs text-gray-500">+{additionalCount}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

**Also update:**
- [ ] `src/components/CurrentEventCard.tsx`
- [ ] `src/components/GlossaryTermCard.tsx`
- [ ] `src/components/PersonCard.tsx`
- [ ] `src/components/OrganizationCard.tsx`

### 3. Timeline Subject Filter

**File**: `src/pages/TimelinePage.tsx`

- [x] Add subject filter dropdown/selector
- [ ] Support multi-select for cross-subject filtering
- [x] URL state sync (`?subject=science-cs-nlp`)

**File**: `src/components/Filters/SubjectFilter.tsx` (new)

- [x] Hierarchical subject selector
  ```tsx
  interface SubjectFilterProps {
    selectedSlugs: string[];
    onChange: (slugs: string[]) => void;
  }

  export function SubjectFilter({ selectedSlugs, onChange }: SubjectFilterProps) {
    const { data: tree } = useSubjectTree();

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-64">
            {selectedSlugs.length === 0
              ? 'Filter by Subject'
              : `${selectedSlugs.length} subject(s) selected`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-96 overflow-auto">
          <SubjectTreeSelector
            tree={tree}
            selected={selectedSlugs}
            onSelect={onChange}
          />
        </PopoverContent>
      </Popover>
    );
  }
  ```

- [ ] Tree-style multi-select with checkboxes
- [ ] "Select all in domain" option
- [ ] Clear all button
- [ ] Show content count next to each subject

### 4. Subject Discovery Page

**File**: `src/pages/SubjectsPage.tsx` (new)

- [x] Route: `/subjects`
- [x] Grid of domain cards
- [x] Each domain expands to show categories
- [x] Click through to subject detail

```tsx
export function SubjectsPage() {
  const { data: tree } = useSubjectTree();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Explore by Subject</h1>
      <p className="text-gray-600 mb-8">
        Discover AI history organized by topic. Click any subject to see related content.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tree?.map(domain => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    </div>
  );
}
```

**File**: `src/components/subjects/DomainCard.tsx` (new)

- [ ] Domain card with color accent
- [ ] Expandable list of categories
- [ ] Content count badges
- [ ] Hover preview of popular content

### 5. Subject Detail Page

**File**: `src/pages/SubjectPage.tsx` (new)

- [x] Route: `/subjects/:slug`
- [x] Subject header with breadcrumbs
- [x] Stats summary (milestone count, terms, etc.)
- [x] Tabbed content view:
  - Timeline tab (milestones)
  - Concepts tab (glossary)
  - News tab (current events)
  - People tab
  - Organizations tab
- [ ] Auto-generated learning path CTA

```tsx
export function SubjectPage() {
  const { slug } = useParams();
  const { data: subject } = useSubject(slug);
  const { data: stats } = useSubjectStats(slug);
  const { data: learningPath } = useSubjectLearningPath(slug);

  const tabs = [
    { id: 'timeline', label: 'Timeline', count: stats?.milestones },
    { id: 'concepts', label: 'Concepts', count: stats?.glossaryTerms },
    { id: 'news', label: 'News', count: stats?.currentEvents },
    { id: 'people', label: 'People', count: stats?.persons },
    { id: 'orgs', label: 'Organizations', count: stats?.organizations },
  ];

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumbs */}
      <SubjectBreadcrumbs subject={subject} />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: subject.color + '20' }}
        >
          {subject.icon || '📚'}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{subject.name}</h1>
          <p className="text-gray-600">{subject.description}</p>
        </div>
      </div>

      {/* Learning Path CTA */}
      {learningPath && (
        <LearningPathCTA path={learningPath} />
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="timeline">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="timeline">
          <SubjectTimeline subjectSlug={slug} />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

### 6. Subject Sidebar Navigation

**File**: `src/components/layout/SubjectSidebar.tsx` (new)

- [ ] Collapsible tree navigation
- [ ] Show on wider screens, hide on mobile
- [ ] Highlight current subject
- [ ] Quick links to domains

```tsx
export function SubjectSidebar() {
  const { data: tree } = useSubjectTree();
  const { slug: currentSlug } = useParams();

  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r">
      <div className="sticky top-20 p-4">
        <h3 className="font-semibold mb-4">Browse Subjects</h3>
        <SubjectTreeNav
          tree={tree}
          currentSlug={currentSlug}
        />
      </div>
    </aside>
  );
}
```

- [ ] Add to layout for subject pages

### 7. Related Content by Subject

**File**: `src/components/RelatedBySubject.tsx` (new)

- [ ] Show on milestone/event/term detail pages
- [ ] "More in [Subject]" section

```tsx
interface RelatedBySubjectProps {
  contentType: ContentType;
  contentId: string;
  excludeTypes?: ContentType[];
}

export function RelatedBySubject({
  contentType,
  contentId,
  excludeTypes,
}: RelatedBySubjectProps) {
  const { data: related } = useRelatedContent(contentType, contentId);

  if (!related?.length) return null;

  return (
    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">Related by Subject</h3>
      <div className="space-y-3">
        {related.map(item => (
          <RelatedContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] Add to MilestoneDetailPage
- [ ] Add to GlossaryTermPage
- [ ] Add to CurrentEventPage

### 8. Subject Search/Autocomplete

**File**: `src/components/search/SubjectSearch.tsx` (new)

- [ ] Searchable subject selector
- [ ] Fuzzy match on name, synonyms
- [ ] Show in global search results

```tsx
export function SubjectSearch({ onSelect }: { onSelect: (subject: Subject) => void }) {
  const [query, setQuery] = useState('');
  const { data: results } = useSubjectSearch(query);

  return (
    <Command>
      <CommandInput
        placeholder="Search subjects..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {results?.map(subject => (
          <CommandItem
            key={subject.id}
            onSelect={() => onSelect(subject)}
          >
            <SubjectBadge subject={subject} size="sm" />
            <span className="ml-2 text-sm text-gray-500">{subject.path}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
```

### 9. Subject in Global Header Search

**File**: `src/components/layout/GlobalSearch.tsx` (if exists)

- [ ] Add "Subjects" section to search results
- [ ] Show matching subjects alongside content results

### 10. Navigation Updates

**File**: `src/components/Header.tsx`

- [x] Add "Subjects" link to main navigation
- [ ] Dropdown with domain quick links

**File**: `src/App.tsx`

- [x] Add routes:
  - `/subjects` → SubjectsPage
  - `/subjects/:slug` → SubjectPage

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test all web features.

### Subject Badges - Browser Validation

- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to timeline page
- [ ] Verify subject badges appear on milestone cards
- [ ] Click a badge and verify filter is applied
- [ ] Screenshot badge display

### Subject Filter - Browser Validation

- [ ] Navigate to timeline page
- [ ] Open subject filter dropdown
- [ ] Select a subject and verify timeline filters
- [ ] Select multiple subjects
- [ ] Clear filter and verify all content returns
- [ ] Test URL state: `/?subject=science-cs-nlp`
- [ ] Screenshot filtered state

### Subject Discovery Page - Browser Validation

- [ ] Navigate to `/subjects`
- [ ] Verify all domains display
- [ ] Expand a domain to see categories
- [ ] Click through to subject detail page
- [ ] Test responsive layout on mobile
- [ ] Check console for errors
- [ ] Screenshot discovery page

### Subject Detail Page - Browser Validation

- [ ] Navigate to `/subjects/science-cs-nlp`
- [ ] Verify header, breadcrumbs, stats
- [ ] Test each tab (Timeline, Concepts, News, etc.)
- [ ] Click learning path CTA
- [ ] Test child subject navigation
- [ ] Screenshot detail page

### Related Content - Browser Validation

- [ ] Navigate to a milestone detail page
- [ ] Verify "Related by Subject" section appears
- [ ] Click a related item and verify navigation
- [ ] Screenshot related content section

---

## Acceptance Criteria

- [ ] Subject badges display on all content cards
- [ ] Timeline can be filtered by subject
- [ ] Subject discovery page shows full taxonomy
- [ ] Subject detail page shows tabbed content
- [ ] Related content appears on detail pages
- [ ] Subject search works in autocomplete
- [ ] Navigation includes subject links
- [ ] Mobile responsive design
- [ ] URL state syncs with filters
- [ ] All browser validation tasks completed

---

## Notes for Future Developers

### Color Consistency
Subject colors are stored in the Subject model. Use with opacity for backgrounds (`color + '20'`) and solid for text/icons.

### Badge Click Behavior
Clicking a badge should:
- On timeline: Filter timeline to that subject
- On detail pages: Navigate to subject page
- In search: Select the subject

### Performance
Subject tree can be cached client-side. Only refetch on taxonomy changes (rare).

### Mobile Considerations
- Subject sidebar hides on mobile
- Use bottom sheet for subject filter
- Collapse long subject paths

### Analytics
Track subject page views and filter usage to understand user interests.
