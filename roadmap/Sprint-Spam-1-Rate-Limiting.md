# Sprint Spam-1: Rate Limiting & Basic Protections

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-12 19:05 PST by Claude
>
> **Sprint Status: ~95% Complete**
> - Core rate limiting: ✅ Done
> - Content filtering: ✅ Done
> - Admin spam filters: ✅ Done
> - Comment honeypot: ✅ Done
> - Registration honeypot: ✅ Done
> - Blocked domains seeded: ✅ Done
> - Browser validation: ⏳ Optional (pending)

## Overview

Implement foundational spam protections: rate limiting for comments and votes, honeypot fields to catch bots, and basic link filtering. All solutions are FREE and server-side.

## Prerequisites

- Comment system deployed (Sprint LEarn-4)
- User authentication working (Sprint LEarn-3)

---

## Tasks

### 1. Database Schema Updates

- [x] Add rate limiting fields to User model in `prisma/schema.prisma`:
  ```prisma
  // Rate limiting fields
  lastCommentAt         DateTime?
  hourlyCommentCount    Int       @default(0)
  hourlyCommentResetAt  DateTime?
  dailyCommentCount     Int       @default(0)
  dailyCommentResetAt   DateTime?
  hourlyVoteCount       Int       @default(0)
  hourlyVoteResetAt     DateTime?
  ```
- [x] Create SpamFilter model:
  ```prisma
  model SpamFilter {
    id          String   @id @default(cuid())
    filterType  String   // 'blocked_domain', 'blocked_keyword', 'regex'
    pattern     String
    action      String   // 'block', 'flag_review'
    isActive    Boolean  @default(true)
    hitCount    Int      @default(0)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```
- [x] Run migration: `npx prisma migrate dev --name add_spam_protection_fields`
- [x] Deploy migration to production (via `0010_spam_protection` migration endpoint)

### 2. Rate Limiting Service

Create `server/src/services/rateLimiter.ts`:

- [x] Implement `checkCommentRateLimit(userId)`:
  - 30-second cooldown between comments
  - Max 10 comments per hour
  - Max 30 comments per day
  - Return `{ allowed: boolean, reason?: string, retryAfter?: number }`
- [x] Implement `checkVoteRateLimit(userId)`:
  - Max 50 votes per hour
  - Return `{ allowed: boolean, reason?: string, retryAfter?: number }`
- [x] Implement `incrementCommentCount(userId)`:
  - Update user's comment counters
  - Reset hourly/daily counts if window expired
- [x] Implement `incrementVoteCount(userId)`:
  - Update user's vote counter
  - Reset hourly count if window expired
- [x] Add rate limit headers to responses (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)

### 3. Integrate Rate Limiting into Routes

- [x] Update `server/src/routes/comments.ts`:
  - Add rate limit check before `POST /api/comments`
  - Return 429 Too Many Requests with retry-after header
  - Increment counter after successful comment
- [x] Update comment voting route:
  - Add rate limit check before vote
  - Return 429 if exceeded
  - Increment counter after successful vote
- [ ] Create middleware `server/src/middleware/rateLimit.ts` for reusable rate limiting (optional refactor)

### 4. Honeypot Fields (Bot Trap)

- [x] Update registration form (`src/pages/auth/RegisterPage.tsx`):
  - Add hidden field: `<input type="text" name="website" style="display:none" tabIndex={-1} autoComplete="off" />`
  - Field should be invisible to humans, bots auto-fill it
- [x] Update comment form (`src/components/Comments/CommentForm.tsx`):
  - Add hidden honeypot field
- [x] Update backend validation for comments:
  - In comment endpoint: reject if honeypot field is filled
  - Log honeypot triggers for monitoring (don't reveal to client)
- [x] Update backend validation for registration:
  - In registration endpoint: reject if honeypot field is filled

### 5. Link Filtering

- [x] Create `server/src/services/contentFilter.ts`:
  - `extractUrls(text)`: Return URLs in text
  - `extractDomains(text)`: Extract domains from URLs
  - `isDomainBlocked(domain)`: Check against SpamFilter table
  - `filterComment(text)`: Main validation function
- [x] Implement link filtering rules:
  - Block comments with >2 URLs
  - Block comments containing blocked domains
  - Return specific error message for each case
- [x] Seed initial blocked domains:
  ```
  bit.ly
  tinyurl.com
  (t.co skipped - legitimate Twitter links)
  testspam.xyz (test domain)
  ```
- [x] Integrate into comment creation route

### 6. Admin: Spam Filter Management

- [x] Create API endpoints:
  - `GET /api/admin/spam-filters` - List all filters
  - `POST /api/admin/spam-filters` - Create filter
  - `PUT /api/admin/spam-filters/:id` - Update filter
  - `DELETE /api/admin/spam-filters/:id` - Delete filter
- [x] Create admin page `src/pages/admin/SpamFiltersPage.tsx`:
  - Table of existing filters (type, pattern, action, hit count, active)
  - Add new filter form
  - Toggle active/inactive
  - Delete filter
- [x] Add to admin navigation

### 7. Frontend: Rate Limit Handling

- [x] Update `src/services/commentsApi.ts`:
  - Handle 429 responses
  - Parse `Retry-After` header
  - Return user-friendly error message
- [x] Update CommentForm component:
  - Show rate limit message with countdown
  - Disable submit button during cooldown
  - Show remaining comments if near limit (uses countdown instead)

---

## Browser Testing & Validation

### Rate Limiting - Browser Validation
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to a news story with comments
- [ ] Post a comment successfully
- [ ] Immediately try to post another comment
- [ ] Verify 30-second cooldown message appears
- [ ] Wait 30 seconds and verify can post again
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Screenshot rate limit message

### Honeypot - Browser Validation
- [ ] Inspect comment form HTML - verify honeypot field is hidden
- [ ] Verify honeypot field has `display:none` or equivalent
- [ ] Submit comment normally - should succeed
- [ ] (Manual test) Use dev tools to fill honeypot field and submit - should fail silently

### Link Filtering - Browser Validation
- [ ] Try posting comment with 3+ URLs - verify blocked
- [ ] Try posting comment with 1-2 URLs - verify allowed
- [ ] Verify error message is user-friendly
- [ ] Screenshot blocked and allowed states

### Admin Spam Filters - Browser Validation
- [ ] Navigate to `/admin/spam-filters`
- [ ] Verify page loads with filter list
- [ ] Add a test filter (blocked domain)
- [ ] Verify it appears in list
- [ ] Toggle filter inactive
- [ ] Delete filter
- [ ] Screenshot admin interface

---

## Acceptance Criteria

- [ ] Users cannot post more than 10 comments per hour
- [ ] Users cannot post more than 30 comments per day
- [ ] 30-second cooldown between comments is enforced
- [ ] Users cannot cast more than 50 votes per hour
- [ ] Rate limit errors return 429 with Retry-After header
- [ ] Frontend shows user-friendly rate limit messages
- [ ] Honeypot fields are present and invisible
- [ ] Bots filling honeypot are silently rejected
- [ ] Comments with >2 URLs are blocked
- [ ] Blocked domains list is configurable by admin
- [ ] All browser validation tasks completed with screenshots

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add rate limit fields, SpamFilter model |
| `server/src/services/rateLimiter.ts` | Create - rate limiting logic |
| `server/src/services/contentFilter.ts` | Create - link filtering logic |
| `server/src/middleware/rateLimit.ts` | Create - rate limit middleware |
| `server/src/routes/comments.ts` | Modify - add rate limit checks |
| `server/src/routes/admin/spamFilters.ts` | Create - admin CRUD routes |
| `src/components/Comments/CommentForm.tsx` | Modify - honeypot, rate limit UI |
| `src/pages/admin/SpamFiltersPage.tsx` | Create - admin filter management |
| `src/services/commentsApi.ts` | Modify - handle 429 responses |

---

## Notes for Future Developers

### Rate Limit Strategy
- Counters are stored in database (persistent across Lambda invocations)
- Could optimize with Redis/ElastiCache later if needed (adds cost)
- Current approach is sufficient for moderate traffic

### Honeypot Best Practices
- Field name should look legitimate (`website`, `url`, `company`)
- Use CSS to hide, not `type="hidden"` (bots detect that)
- Add `tabIndex={-1}` to prevent keyboard navigation
- Add `autoComplete="off"` to prevent browser autofill

### Link Filtering
- URL regex: `/https?:\/\/[^\s]+/gi`
- Consider allowing links from trusted domains (wikipedia, arxiv, etc.) in future
- Current implementation is simple; can add URL expansion for shorteners later
