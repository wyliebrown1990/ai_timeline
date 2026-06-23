# Designer Brief: Hand-Drawn Illustration of the Amicai Journal Page

## Project context
Amicai is a personal AI journal that helps people write naturally and surfaces patterns, threads, and reflections from their entries. I need a hand-drawn illustration of our `/journal` page — same layout, same structural hierarchy, same visual rhythm as the attached screenshot, but with **made-up placeholder content** (the real text is private). Treat it like a wireframe rendered in a warm, sketched-by-hand style — feels more like a designer's notebook than a polished UI mock.

## Visual style
- Hand-drawn / Excalidraw aesthetic: pencil or fine-marker linework, slightly imperfect strokes, gentle pen-pressure variation
- Muted color fills behind cards (soft lavender, cream, mint, pale yellow) — not flat brand colors
- Handwritten labels for section eyebrows and chips; body text in a clean sketched sans (think iA Writer in pencil)
- Asymmetric, slightly wobbling rectangles for cards. Avoid pixel-perfect alignment — that's the point
- Background: off-white paper texture

## Canvas
Desktop view, ~1440×1100. Two-column layout in the body (main column ~960px, sidebar ~360px) under a full-width top nav and page header.

---

## Section-by-section

### 1. Top navigation bar (full width)
**Purpose:** primary product nav. Always visible across the app.
**Render:** logo at far left ("Amicai" wordmark with a small notebook icon), then a horizontal row of nav items, then user-account cluster at far right.
**Items, left → right:**
`Amicai` (logo) · `Dashboard` · `Contacts` · `Goals` · **`Journal`** (active — boxed/highlighted with a small "3" flame badge next to it) · `Chat` · `Relationships` · `More ▾` · `Pro` (pill badge, mint) · `samanthak…` (truncated username) · circular avatar with initials "SK"
Each nav item has a tiny hand-drawn icon to its left (home, people, target, open book, speech bubble, heart, three dots).

### 2. Page header (below nav, full width)
**Purpose:** sets context — what page you're on, your activity stats, and the primary actions.
**Left side:**
- H1: **`Journal`** (large, sketched serif or bold sans)
- Inline "🔥 3 day" streak badge to the right of the title
- Sub-stats line in smaller text: `47 entries · 41 AI enriched · 2 this week`
- Tagline below: *"Write naturally — AI organizes everything for you"*

**Right side (action buttons):**
- Outlined button: `Threads`
- Filled primary button (deep indigo/violet): `✨ New Entry`

### 3. Sub-tab nav (horizontal row under the header)
**Purpose:** switches view modes inside the journal.
Four tabs left-aligned:
**`📝 Timeline`** (active — underlined in indigo) · `🔍 Search` · `📊 Insights` · `🌙 Evening Prompts`

### 4. Pinned "Where I am right now" banner (full main-column width, soft lavender background)
**Purpose:** a single sentence the user pins to remind themselves of their current life context — surfaced at the top of every journal session.
- Small pushpin icon at far left
- Eyebrow label in caps: `WHERE I AM RIGHT NOW`
- Body text (truncated with ellipsis):
  > *"I'm balancing two part-time consulting clients while finishing my pottery certification — trying not to let the deadline pressure crowd out the creative work that actually fills me up…"*
- Far right: small `✏️ Edit` link

### 5. "Noticed a pattern" insight card (large white card with rounded corners, subtle shadow)
**Purpose:** AI-surfaced theme it's noticed across multiple recent entries. User can either turn it into a Thread (a long-running narrative) or dismiss it.
- Eyebrow in muted green caps: `NOTICED A PATTERN`
- "···" overflow menu in top-right corner
- Headline (bold, ~24px): **`Saying yes to projects you haven't fully thought through`**
- Body paragraph (2 lines, lighter weight):
  > *"Across the last four entries you've described agreeing to commitments — the gallery show, Maya's wedding planning, the consulting handoff — before checking your own capacity. Each time you've mentioned regret within…"*
- Two buttons below the body:
  - Filled green pill: `Create thread`
  - Outlined pill: `Dismiss`

### 6. "This week" reflection card (full width, soft lavender/lilac background)
**Purpose:** the AI's weekly synthesis of what the user has been processing — written in second person, tagged with the people who appear in it. This is the showcase feature.
- Sparkle icon ✨ + eyebrow caps in violet: `THIS WEEK`
- Top-right corner: small `👁 Seen` indicator
- First paragraph of body text (mix of regular and italicized phrases — italics signal AI-extracted concepts):
  > *"You're asking Maya for **clear timelines** instead of working around vague ones. You're asking Daniel to slow down before he commits the team to another quarter. You're noticing the pattern — you're at your best when you're helping someone else see what's actually in front of them, but you still flinch when it's your turn to be looked at clearly."*
- Person chips below the paragraph (rounded pill, soft purple):
  `Maya` `Daniel R` `Priya Shah`
- Second paragraph:
  > *"The coffee with Priya turned into something closer to a real conversation than either of you expected. The text exchange with Jordan landed differently this time. You're not waiting to be invited into closeness anymore — you're just… showing up. The thing you said you wanted more of in your twenties is happening now, but you might not be calling it that."*
- More person chips:
  `Priya Shah` `Jordan`

### 7. Journal entry card (white card, full main-column width)
**Purpose:** an actual entry the user wrote, AI-enriched with sentiment, topic tags, and people tags.
- Top row: `4 hours ago` · `😊 positive` (mood badge with emoji) · topic chips: `creative` `flow` `+2`
- Top-right corner: small reaction icon 💬 and edit ✏️
- Title (bold): **`Studio session that actually went somewhere`**
- Body (3 lines):
  > *"Spent the morning at the studio working on the new glaze tests for Saturday's open house. Something clicked with the cobalt blend that's been frustrating me for a month — the surface tension finally felt right. Stayed two hours longer than planned and missed the call with the consulting client, but for once I don't feel guilty about it."*
- Topic tag row at bottom (rounded pills, pale yellow):
  `🟡 ceramics` `🟡 creative-work` `🟡 flow-state` `🟡 boundaries` `+2 more`
- Person tag at very bottom: `👥 Maya Hollis`

---

## Right sidebar (~360px, runs alongside cards 6 + 7)

### 8. Threads section
**Purpose:** shortcuts into long-running narrative threads the user is building.
- Header row: `THREADS` (caps, muted) — far right: `View all` link in indigo
- Two thread cards, each:
  - Person/tag icon at left
  - Bold thread title (truncated): **`Maya: trust, tempo, working closer together`** — second card: **`The version of me that doesn't need to perform`**
  - Subtext: `Updated 2 weeks ago` — second: `Updated 1 week ago`
  - Thread number pill at right: `#7` and `#12`

### 9. Follow-through section
**Purpose:** small action items / reminders the user (or AI) flagged from past entries.
- Header row: `FOLLOW-THROUGH` (caps, muted) — far right: `View all` link
- Three rows, each:
  - Status chip (left, pale violet): `Kept in mind` / `Kept in mind` / `Reminder set`
  - Truncated label: `Send…` / `Ask…` / `Re…`
  - Priority chip (right, pale red/yellow/green): `high priority` / `medium priority` / `medium priority`
  - "···" overflow menu at far right
- Tiny helper text under the first row: *"Tap … for actions"*

---

## Tone & feel notes for the designer
- This page should feel **calm and reflective**, not productivity-app busy. Generous whitespace between cards (~24–32px gaps).
- The lavender/lilac "This Week" card is the visual anchor — it should feel slightly more saturated than everything around it. That's the magic moment.
- Person chips, topic tags, and sub-tabs all feel slightly different from each other in shape/fill — they're three distinct categories, not one styling.
- Keep the hand-drawn lines tight enough that the hierarchy is clear at a glance, but loose enough that you can tell a human drew it.
- All placeholder names (Maya, Daniel R, Priya Shah, Jordan, Maya Hollis, Samantha K) and all body text are fictional — feel free to swap for other plausible-feeling names if you'd like, just keep the *shape* of the data identical.

## Deliverable
- Single PNG, ~2880×2200 (2x), transparent or warm-cream background
- Layered source file (Procreate / Figma / Photoshop) so we can pull individual cards out for marketing use later
