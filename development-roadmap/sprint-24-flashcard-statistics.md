# Sprint 24: Flashcard Statistics & Review History

**Impact**: Medium | **Effort**: Medium | **Dependencies**: Sprint 23 (Study Center)

## Overview
Add comprehensive statistics tracking and visualization to help users understand their learning progress. Includes review history, retention graphs, forecast of upcoming reviews, and performance insights.

---

## Tasks

### 24.1 Statistics Data Collection
- [x] Track each review session in localStorage
- [x] Store daily review counts for graphing
- [x] Calculate rolling retention rate (% correct over last 7/30 days)
- [x] Track time spent studying (session durations)
- [x] Identify "most challenging" cards (most "Again" ratings)
- [x] Keep last 90 days of history, prune older data

### 24.2 Statistics Page
- [x] Create `src/pages/StudyStatsPage.tsx`
- [x] Add route `/study/stats`
- [x] Add "Stats" tab/link in Study Center navigation
- [x] Responsive layout for mobile and desktop

### 24.3 Overview Stats Component
- [x] Create `src/components/Flashcards/StatsOverview.tsx`
- [x] Display total cards in collection
- [x] Display cards mastered (interval > 21 days)
- [x] Display current streak with longest streak
- [x] Display total reviews all-time
- [x] Display average retention rate

### 24.4 Review Activity Graph
- [x] Create `src/components/Flashcards/ReviewActivityChart.tsx`
- [x] Bar chart showing reviews per day (last 30 days)
- [x] Color-code by rating distribution (again/hard/good/easy)
- [x] Show hover tooltip with exact counts
- [x] Handle days with no activity (show zero)
- [x] Use simple CSS/SVG (no heavy charting library)

### 24.5 Retention Rate Graph
- [x] Create `src/components/Flashcards/RetentionChart.tsx`
- [x] Line chart showing % correct over time
- [x] 7-day rolling average to smooth data
- [x] Target line at 85% (optimal retention)
- [x] Show trend indicator (improving/declining)

### 24.6 Upcoming Reviews Forecast
- [x] Create `src/components/Flashcards/ReviewForecast.tsx`
- [x] Calculate cards due per day for next 7 days
- [x] Display as simple bar chart or list
- [x] Help users plan study time
- [x] "Tomorrow: 5 cards, Wednesday: 12 cards..."

### 24.7 Card Performance Insights
- [x] Create `src/components/Flashcards/CardInsights.tsx`
- [x] "Most Challenging" - cards with lowest ease factor
- [x] "Well Known" - cards with highest intervals
- [x] "Needs Review" - cards overdue by most days
- [x] Click card to view or start study session with it

### 24.8 Category Breakdown
- [x] Create `src/components/Flashcards/CategoryBreakdown.tsx`
- [x] Pie or bar chart: milestones vs concepts
- [x] Breakdown by era (for milestones)
- [x] Breakdown by category/topic (for concepts)
- [x] Identify gaps in study coverage

### 24.9 Streak System Enhancement
- [x] Calculate streak based on "reviewed at least 1 card"
- [x] Reset streak if day missed (no reviews)
- [x] Store streak history for display
- [x] Show streak milestones (7 days, 30 days, 100 days)
- [ ] Optional: "freeze" streak with streak freeze item (future)

### 24.10 Export & Data Management
- [x] "Export Data" button to download JSON of all flashcard data
- [x] "Clear All Data" with double confirmation
- [x] Useful for backup or transferring to new device
- [x] Include all cards, packs, sessions, stats in export

---

## Data Structures

### Review History Record
```typescript
interface DailyReviewRecord {
  date: string // YYYY-MM-DD
  totalReviews: number
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
  minutesStudied: number
  uniqueCardsReviewed: number
}

// Stored in localStorage: ai-timeline-flashcard-history
// Array of last 90 days, pruned on each update
```

### Statistics Computed Values
```typescript
interface ComputedStats {
  // Counts
  totalCards: number
  masteredCards: number // interval > 21 days
  learningCards: number // interval 1-21 days
  newCards: number // never reviewed

  // Streaks
  currentStreak: number
  longestStreak: number
  lastStudyDate: string | null

  // Performance
  retentionRate7d: number // % correct last 7 days
  retentionRate30d: number // % correct last 30 days
  averageEaseFactor: number
  totalReviewsAllTime: number
  totalMinutesStudied: number

  // Insights
  mostChallengingCards: string[] // top 5 card IDs
  overdueCards: string[] // cards past due date

  // Forecast
  dueToday: number
  dueTomorrow: number
  dueThisWeek: number
}
```

---

## UI Components

### Statistics Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Study Statistics                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Overview                                                   │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │    47     │ │    23     │ │    89%    │ │  🔥 12    │   │
│  │  Total    │ │ Mastered  │ │ Retention │ │  Streak   │   │
│  │  Cards    │ │  Cards    │ │   Rate    │ │   Days    │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
│  Review Activity (Last 30 Days)                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     ▄                                               │   │
│  │     █  ▄     ▄▄    ▄       ▄    ▄  ▄▄  ▄          │   │
│  │  ▄▄ █▄ █▄ ▄▄ ██ ▄▄ █▄ ▄▄  █▄ ▄▄█▄ ██▄ █▄         │   │
│  │  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀         │   │
│  │  Nov 18                              Dec 18         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Retention Rate                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  100%│                                              │   │
│  │   85%│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ target ─ ─ ─ ─ ─ ─ │   │
│  │      │    ╱╲    ╱──────╲  ╱────                    │   │
│  │   50%│───╱  ╲──╱        ╲╱                         │   │
│  │      │                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Upcoming Reviews              Most Challenging             │
│  ┌────────────────────┐       ┌────────────────────────┐   │
│  │ Today      5 cards │       │ 1. Attention (8 reviews)│  │
│  │ Tomorrow  12 cards │       │ 2. RLHF (6 reviews)     │   │
│  │ Wed        3 cards │       │ 3. Tokenization (5x)    │   │
│  │ Thu        8 cards │       │ [Study Weak Cards →]    │   │
│  │ Fri        2 cards │       └────────────────────────┘   │
│  └────────────────────┘                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [Export Data]                          [Clear All Data]    │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Stats Layout
```
┌─────────────────────────────┐
│  📊 Statistics              │
├─────────────────────────────┤
│                             │
│  ┌─────────┐ ┌─────────┐   │
│  │   47    │ │   23    │   │
│  │  Total  │ │Mastered │   │
│  └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐   │
│  │  89%    │ │ 🔥 12   │   │
│  │Retention│ │ Streak  │   │
│  └─────────┘ └─────────┘   │
│                             │
│  Activity (30d)             │
│  ▄▄█▄▄██▄▄█▄██▄▄█▄█▄▄██    │
│                             │
│  Upcoming                   │
│  • Today: 5 cards           │
│  • Tomorrow: 12 cards       │
│  • This week: 30 cards      │
│                             │
└─────────────────────────────┘
```

### Card Insights Detail
```
┌─────────────────────────────────────────────────────────────┐
│  Most Challenging Cards                                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📖 Attention Mechanism                              │   │
│  │    Reviewed 8 times • Ease factor: 1.8              │   │
│  │    Last: 2 days ago • Next: Tomorrow                │   │
│  │    [Study Now]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📖 RLHF (Reinforcement Learning from Human...)      │   │
│  │    Reviewed 6 times • Ease factor: 1.9              │   │
│  │    Last: 1 day ago • Next: Today                    │   │
│  │    [Study Now]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── pages/
│   └── StudyStatsPage.tsx
├── components/
│   └── Flashcards/
│       ├── StatsOverview.tsx
│       ├── ReviewActivityChart.tsx
│       ├── RetentionChart.tsx
│       ├── ReviewForecast.tsx
│       ├── CardInsights.tsx
│       ├── CategoryBreakdown.tsx
│       └── index.ts
├── lib/
│   └── flashcardStats.ts        # Statistics calculations
```

---

## Chart Implementation Notes

Use simple SVG-based charts rather than heavy libraries:

```typescript
// Simple bar chart example
function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((value, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500 rounded-t"
          style={{ height: `${(value / max) * 100}%` }}
          title={`${value} reviews`}
        />
      ))}
    </div>
  )
}
```

---

## Success Criteria
- [ ] Statistics page accessible from Study Center
- [ ] Overview stats display accurately
- [ ] Review activity graph shows last 30 days
- [ ] Retention rate graph with trend visible
- [ ] Forecast shows next 7 days accurately
- [ ] Most challenging cards identified correctly
- [ ] Category breakdown displays
- [ ] Streak calculation is accurate
- [ ] Export produces valid JSON
- [ ] Clear data works with confirmation
- [ ] Mobile layout is usable
- [ ] Data persists across sessions

---

## Deployment Checklist

### Pre-Deployment
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Statistics calculations have unit tests
- [ ] Charts render without errors
- [ ] Export/import tested

### Production Verification
- [ ] Navigate to /study/stats
- [ ] Verify overview stats match actual data
- [ ] Review some cards, check graph updates
- [ ] Verify forecast accuracy
- [ ] Test export and verify JSON structure
- [ ] Test on mobile device
