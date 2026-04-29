# Sprint PD-2: Chrome Extension — Live-DOM Paywall Detection

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-29 by Claude (initial draft)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the project's extension docs (`extension/README.md`, `extension/docs/` if any).
2. Re-read the parent PLAN's **Developer Workflow (MANDATORY)** section.
3. Confirm PD-1 is fully shipped — the new fields (`isPaywalled`, `paywallReason`) must accept-but-ignore on `/api/admin/articles/submit` before this sprint hits prod.
4. Pick the next unchecked `[ ]` task. Exactly one.
5. After every code block: build the extension (`cd extension && bun run build`), reload it in Chrome, sanity-test against a real paywalled article, commit, check the box.
6. No backwards compatibility unless Wylie explicitly asked.
7. Stop only when the Definition of Done below is met, or when blocked on a PM decision.

---

## Overview

The extension runs `Readability` against the live DOM in `extension/src/content/content.ts`, which means it sees the rendered, authenticated page exactly as the reader does. That's the most accurate place to detect a paywall — the popup overlay, the "subscribe to continue" wrapper, the truncated article body — and pass that signal to the backend at submit time.

This sprint adds three things: live-DOM paywall heuristic in the content script, plumbing it through the popup's submit flow, and including it in the `submitArticle` API call shape.

**Priority**: MEDIUM
**Depends on**: PD-1 (backend accepts new fields)
**Blocks**: Real-device paywall verification — without this, only server-scraped paywalls get flagged
**Estimated Effort**: ~½ day
**Status**: Not started

---

## Tech Lead Review (2026-04-29)

Verified the extension surfaces. Plan is largely accurate — two clarifications, one heuristic-unit mismatch worth fixing before code lands.

### Moderate (resolved by tasks below)

- **M1 — Threshold-unit mismatch between existing `'too_short'` check and proposed step 3.** The existing extension check is `extension/src/content/content.ts:44 sanitized.length < 200` — that's **characters**, not words. The plan's step 3 (`articleWordCount < 200`) is **words** (~1200 chars). They don't conflict — the char check fails extraction outright at line 44 before `detectLiveDomPaywall` ever runs — but it's confusing to have "200" mean two different things in the same file. Suggested fix in Task 1.1: rename the new constant `SHORT_ARTICLE_WORD_THRESHOLD = 200` and add a comment noting it operates on word count, distinct from the existing 200-char floor.

- **M2 — Pass the original `document` (not `docClone`) into `detectLiveDomPaywall`.** Verified `content.ts:31` clones the document because Readability mutates aggressively. The plan's helper signature takes `doc: Document` but doesn't say which one. Paywall overlay elements may have already been stripped from `docClone` by Readability's parse — we need the live, unmutated DOM to find `[class*="paywall"]` etc. Fix in Task 1.1: update the call site to pass `document` (the global, not the clone) and update the JSDoc on `detectLiveDomPaywall` to make this explicit.

- **M3 — Test path question.** Plan hedges with "or `extension/src/lib/__tests__/`". Verified test directories exist at `extension/src/popup/__tests__/` and `extension/src/lib/__tests__/`. Since `content.ts` lives in `extension/src/content/`, the cleanest sibling test path is `extension/src/content/__tests__/content.test.ts` (which doesn't exist yet — would be a new directory). Confirm with extension's `vitest`/`bun test` config (`extension/vite.config.ts` or `package.json`) that this path is picked up before writing.

### Verified ✓ (no change needed)

- `extension/src/content/content.ts:10-25` — `ExtractSuccess` and `ExtractFailure` types are exactly as plan describes. Adding the `paywall: { isPaywalled, reason }` field is a clean union extension.

---

## UX Lead Review (2026-04-29)

The extension popup is a separate runtime from the main LAEA web app, so design-system parity rules are looser here. Two notes.

### Minor

- **PD-2-UX-Mi1 — Popup chip emoji vs. lucide.** Task 3 specs `🔒 Paywalled (extension_overlay)` using emoji + plain text. The popup is small (320px-ish width, popup-only context) and emoji is fine here — but the rest of the extension popup uses lucide icons (verified in `extension/src/popup/components/SubmitPanel.tsx`-area files via the project's existing import patterns). Recommend swapping the emoji for `<Lock className="w-3 h-3" />` from `lucide-react` (already a dep in the extension) so the popup feels coherent. Color: `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200` to mirror the main-app PaywallBadge in PD-3 — keeps mental-model continuity for Wylie when he sees the chip in two places.

- **PD-2-UX-Mi2 — Reason text leaks the heuristic name to the user.** `(extension_overlay)` is internal vocabulary; not useful for the human reading the popup. Either:
  - Drop the parenthetical entirely — just `🔒 Paywalled` is enough confirmation that detection fired
  - Or map heuristic codes to human-readable text: `extension_overlay` → "(paywall overlay detected)", `extension_phrase` → "(found subscribe prompt)", `extension_short_content` → "(article truncated)"
  
  Recommend: drop the parenthetical for v1; keep heuristic codes in DevTools console for debugging. Minor cleanup, makes the chip cleaner.

### Verified ✓

- No motion / animation in PD-2; chip is static. ✓
- The extension popup runs in its own Chrome popup viewport (~360×600) — no responsive concerns at the LAEA site's mobile breakpoints.
- The `'too_short'` failure path at `content.ts:44-45` short-circuits on `sanitized.length < 200` (chars) BEFORE reaching the success return. New `detectLiveDomPaywall` only ever sees ≥200-char Readability output — heuristic step 3 is the right place for "Readability got something but it's medium-short and the DOM is huge."
- `extension/src/popup/lib/submit.ts` — Branch 2 (extract + `/submit`) at lines 110-160 is the right place to forward paywall fields. Branch 1 (server scrape, lines 55-108) doesn't pass them — server runs its own heuristic per PD-1.
- `extension/src/lib/api.ts:116-125 submitArticle` signature is the right insertion point for `isPaywalled?` + `paywallReason?`.
- `extension/src/popup/components/SubmitPanel.tsx` exists (verified via `ls extension/src/popup/components/`).
- `./scripts/build-extension-zip.sh` exists at the repo root (referenced by `deploy-frontend.sh` per project CLAUDE.md). No verification needed before code, but the script path is real.

---

## Prerequisites

- [ ] PD-1 deployed to prod and `POST /api/admin/articles/submit` accepts `isPaywalled` + `paywallReason` (returns 200 with the fields ignored if not present, persists them when present)
- [ ] Extension dev environment working: `cd extension && bun install && bun run build` produces `extension/dist/` and the extension loads via `chrome://extensions → Developer mode → Load unpacked`
- [ ] Read `extension/src/content/content.ts` end-to-end — note `extract()` already returns `success: false, reason: 'too_short'` when Readability sees ≤ 200 chars; we'll extend the success path
- [ ] Read `extension/src/popup/lib/submit.ts` end-to-end — note the `extracting → submitting_extracted` state machine
- [ ] Read `extension/src/lib/api.ts` `submitArticle` shape (lines 116-125)
- [ ] Have one known-paywalled article URL ready for QA (an NYT or WSJ subscriber-only piece you can actually open in your browser, where you ARE authenticated and CAN see the content). Also have a non-paywalled equivalent (a public NYT homepage piece, or any free TechCrunch article) for negative-case verification.

---

## Tasks

### 1. Live-DOM detection in the content script

#### 1.1 Extend `ExtractSuccess` with paywall signals

- [ ] In `extension/src/content/content.ts`, extend `ExtractSuccess`:
  ```ts
  export type ExtractSuccess = {
    success: true;
    title: string;
    textContent: string;
    byline: string | null;
    length: number;
    excerpt: string | null;
    url: string;
    paywall: { isPaywalled: boolean; reason: string | null };
  };
  ```
- [ ] Detection runs AFTER Readability succeeds. Helper:
  ```ts
  function detectLiveDomPaywall(doc: Document, articleText: string): { isPaywalled: boolean; reason: string | null } {
    // 1. Common paywall overlay selectors (NYT, WSJ, FT, Bloomberg observed patterns)
    const OVERLAY_SELECTORS = [
      '[id*="paywall"]', '[class*="paywall"]',
      '[id*="subscribe-prompt"]', '[class*="subscribe-prompt"]',
      '[id*="metered-content"]', '[class*="metered-content"]',
      '[data-testid*="paywall"]',
    ];
    for (const sel of OVERLAY_SELECTORS) {
      if (doc.querySelector(sel)) {
        return { isPaywalled: true, reason: 'extension_overlay' };
      }
    }

    // 2. Phrase match in extracted text (high confidence on live DOM since Readability already stripped chrome)
    const PHRASES = [
      /subscribe to continue/i,
      /log in to read/i,
      /sign in to read/i,
      /to continue reading/i,
      /create.*account.*to continue/i,
      /subscribers? only/i,
      /members? only/i,
    ];
    if (PHRASES.some((p) => p.test(articleText))) {
      return { isPaywalled: true, reason: 'extension_phrase' };
    }

    // 3. Truncation heuristic — Readability content is short, but the page DOM is large.
    //    Indicates the article body is collapsed behind a paywall while the chrome (nav, ads,
    //    footer) is still present. Tunable; bias toward false negatives.
    const articleWordCount = articleText.split(/\s+/).filter(Boolean).length;
    const totalDomCharCount = doc.body.innerText.length; // includes everything visible
    if (articleWordCount < 200 && totalDomCharCount > 4000) {
      return { isPaywalled: true, reason: 'extension_short_content' };
    }

    return { isPaywalled: false, reason: null };
  }
  ```
- [ ] Call `detectLiveDomPaywall` inside `extract()` against the original `document` (NOT the cloned one — overlay elements may be removed during Readability's destructive parse). Pass the sanitized `textContent` for phrase matching.
- [ ] Add the `paywall` field to the `ExtractSuccess` return.

#### 1.2 Update extension content-script tests

- [ ] In `extension/src/popup/__tests__/` (or `extension/src/lib/__tests__/`, whichever holds existing extraction-related tests), add cases:
  - DOM with `<div class="paywall">` element → `extension_overlay`
  - DOM with no overlay but content includes "Subscribe to continue" → `extension_phrase`
  - Short article text + large DOM → `extension_short_content`
  - Long, clean article → `isPaywalled: false`
- [ ] `cd extension && bun test` (or whatever the extension's test command is — check `extension/package.json` `scripts.test`)

### 2. Plumb signals through the popup submit flow

#### 2.1 Pass paywall signals to `submitArticle`

- [ ] In `extension/src/popup/lib/submit.ts`, in **Branch 2** (client extraction + `/submit`), update the call:
  ```ts
  const resp = await deps.submitArticle({
    sourceUrl: extracted.url,
    title: extracted.title,
    content: extracted.textContent,
    isPaywalled: extracted.paywall.isPaywalled,
    paywallReason: extracted.paywall.reason,
  });
  ```
- [ ] Branch 1 (server scrape) does NOT pass these — server runs its own heuristic on the scraped HTML. The flag set there comes from PD-1's controller logic.

#### 2.2 Update the `submitArticle` API surface

- [ ] In `extension/src/lib/api.ts`, extend the function signature:
  ```ts
  export async function submitArticle(payload: {
    sourceUrl: string;
    title: string;
    content: string;
    isPaywalled?: boolean;
    paywallReason?: string | null;
  }): Promise<SubmitResponse> { … }
  ```
- [ ] Body forwards all five fields to `/api/admin/articles/submit`. PD-1 already accepts the optional fields server-side.

### 3. Show the user that we detected a paywall

A small affordance in the popup so Wylie knows the heuristic fired before he submits. Doesn't change submission behavior — informational only.

- [ ] In `extension/src/popup/components/SubmitPanel.tsx` (or whichever component renders the extracted-article preview), if `extracted.paywall.isPaywalled === true`, render a small chip near the title preview:
  ```tsx
  {extracted.paywall.isPaywalled && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      🔒 Paywalled ({extracted.paywall.reason})
    </span>
  )}
  ```
- [ ] No icon dependency — emoji is fine in the popup; matches the rest of the popup's styling.

### 4. Build, sideload, real-page QA

- [ ] `cd extension && bun run build` — clean build, no warnings
- [ ] `chrome://extensions` → reload the unpacked extension (id `lfakkoeldmhibejkjolcmenpmlokbled`)
- [ ] Open a real paywalled article in Chrome (must be a publication you're subscribed to — the extension reads YOUR live DOM). Click the extension icon → submit. Confirm:
  - The popup shows the 🔒 chip
  - The submitted record on prod (`/admin/articles`) has `isPaywalled: true` and the right reason
- [ ] Open a non-paywalled article (e.g. TechCrunch homepage piece). Submit. Confirm `isPaywalled: false` and no chip.
- [ ] Test with a paywall site you're NOT subscribed to (e.g. open NYT in an Incognito window). Submit. Should flag — DOM contains the paywall overlay even though Readability extracted some preview text.

### 5. Deploy

- [ ] No prod deploy needed — extension is sideloaded. Bump `extension/package.json` version (semver patch) so the changelog is clean.
- [ ] Re-package the public download zip:
  ```bash
  ./scripts/build-extension-zip.sh
  ```
  This places `public/ai-timeline-extension.zip` ready for the next `./scripts/deploy-frontend.sh` (which auto-bundles it). Deploy when convenient.

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Submitting a paywalled article via the extension persists `isPaywalled: true` on prod with one of `extension_overlay` / `extension_phrase` / `extension_short_content`
- [ ] Submitting a non-paywalled article persists `isPaywalled: false`
- [ ] Popup shows the 🔒 chip when the heuristic fires
- [ ] Extension content-script tests cover the three trigger paths
- [ ] Extension version bumped + zip rebuilt
- [ ] Sprint file timestamp updated and committed

---

## Files Touched (expected)

```
extension/src/content/content.ts                           (modify — add detectLiveDomPaywall + extend ExtractSuccess)
extension/src/popup/lib/submit.ts                          (modify — forward paywall fields)
extension/src/lib/api.ts                                   (modify — extend submitArticle payload type)
extension/src/popup/components/SubmitPanel.tsx             (modify — render chip when paywalled)
extension/src/lib/__tests__/contentExtract.test.ts         (new or extend — three trigger-path cases)
extension/package.json                                     (modify — version bump)
public/ai-timeline-extension.zip                           (regenerated by build script)
public/ai-timeline-extension.json                          (regenerated)
```

---

## Blocked — PM decision needed

1. **Submitting a known paywalled article you ARE subscribed to** — the extension will see full content, the live-DOM heuristic likely WON'T fire, but the article's still from a paywalled domain. Server-side `known_domain` heuristic from PD-1 should cover this. Confirm we're OK relying on PD-1's server-side hostname check for this case rather than always-flagging when the host is on the paywalled list (which would over-flag for free pieces from paywalled publishers).
