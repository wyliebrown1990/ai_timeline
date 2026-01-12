# Sprint Spam-3: Shadowbanning & Moderation Tools

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Implement shadowbanning for confirmed spammers, auto-flagging system for suspicious content, enhanced moderation dashboard, and configure Cloudflare's FREE bot protection features.

**Cost: FREE** - Cloudflare Bot Fight Mode and security rules are free tier.

## Prerequisites

- Sprint Spam-1 complete (rate limiting, content filtering)
- Sprint Spam-2 complete (trust system)

---

## Tasks

### 1. Database Schema Updates

- [ ] Add shadowban field to User model (if not already):
  ```prisma
  isShadowbanned    Boolean   @default(false)
  shadowbannedAt    DateTime?
  shadowbanReason   String?
  ```
- [ ] Create ModerationLog model:
  ```prisma
  model ModerationLog {
    id            String   @id @default(cuid())
    moderatorId   String?  // null if automated
    action        String   // 'shadowban', 'unshadowban', 'ban', 'remove_comment', 'flag', 'approve'
    targetType    String   // 'user', 'comment'
    targetId      String
    reason        String?
    automated     Boolean  @default(false)
    metadata      Json?
    createdAt     DateTime @default(now())

    @@index([targetType, targetId])
    @@index([createdAt])
  }
  ```
- [ ] Create FlaggedContent model:
  ```prisma
  model FlaggedContent {
    id          String   @id @default(cuid())
    contentType String   // 'comment'
    contentId   String
    reason      String   // 'new_account_link', 'similar_text', 'rapid_posting', 'user_report'
    severity    String   @default("medium")  // 'low', 'medium', 'high'
    status      String   @default("pending") // 'pending', 'approved', 'removed'
    reviewedBy  String?
    reviewedAt  DateTime?
    createdAt   DateTime @default(now())

    @@index([status, createdAt])
    @@unique([contentType, contentId])
  }
  ```
- [ ] Run migration: `npx prisma migrate dev --name add_moderation_system`
- [ ] Deploy migration to production

### 2. Shadowban Implementation

Create `server/src/services/shadowbanService.ts`:

- [ ] Implement `shadowbanUser(userId, moderatorId, reason)`:
  - Set `isShadowbanned = true`
  - Log to ModerationLog
  - Return updated user
- [ ] Implement `unshadowbanUser(userId, moderatorId)`:
  - Set `isShadowbanned = false`
  - Log to ModerationLog
- [ ] Implement `isUserShadowbanned(userId)`: Quick check

Update comment retrieval:

- [ ] Update `server/src/services/commentService.ts` `getCommentsForTarget()`:
  - If requesting user is shadowbanned:
    - Include their own comments in results (they see their content)
  - For all other users:
    - Exclude comments from shadowbanned users
  - Implementation:
    ```typescript
    const excludeShadowbanned = !requestingUserId ||
      !(await isUserShadowbanned(requestingUserId));

    const where = {
      // ... existing filters
      ...(excludeShadowbanned && {
        author: { isShadowbanned: false }
      })
    };
    ```
- [ ] Shadowbanned users' comments don't appear in:
  - Comment lists (for other users)
  - User profile comment history (for other users)
  - Comment counts (for other users)

### 3. Auto-Flagging System

Create `server/src/services/autoFlagService.ts`:

- [ ] Implement `checkAndFlagComment(comment, author)`:
  - Returns `{ shouldFlag: boolean, reason?: string, severity?: string }`
- [ ] Flag conditions:
  ```typescript
  // High severity
  if (accountAgeDays < 7 && hasUrls) {
    return { shouldFlag: true, reason: 'new_account_link', severity: 'high' };
  }

  // Medium severity
  if (await hasSimilarRecentComment(author.id, comment.body)) {
    return { shouldFlag: true, reason: 'similar_text', severity: 'medium' };
  }

  // Medium severity
  if (await isRapidPosting(author.id)) {  // >5 comments in 10 minutes
    return { shouldFlag: true, reason: 'rapid_posting', severity: 'medium' };
  }

  // Low severity
  if (author.trustScore < 5 && comment.body.length > 500) {
    return { shouldFlag: true, reason: 'low_trust_long_comment', severity: 'low' };
  }
  ```
- [ ] Implement `hasSimilarRecentComment(userId, text)`:
  - Get user's comments from last 24 hours
  - Calculate Levenshtein distance or simple similarity
  - Flag if >80% similar to any recent comment
- [ ] Implement `isRapidPosting(userId)`:
  - Count comments in last 10 minutes
  - Return true if >5
- [ ] Implement `createFlag(contentType, contentId, reason, severity)`:
  - Insert into FlaggedContent table
  - Upsert (don't duplicate flags)

Integrate into comment creation:

- [ ] In `server/src/routes/comments.ts` after successful comment creation:
  ```typescript
  const flagResult = await checkAndFlagComment(comment, author);
  if (flagResult.shouldFlag) {
    await createFlag('comment', comment.id, flagResult.reason, flagResult.severity);
  }
  ```

### 4. Moderation Dashboard Enhancements

Create/update `server/src/routes/admin/moderation.ts`:

- [ ] `GET /api/admin/moderation/flagged`:
  - List flagged content with pagination
  - Filter by status, severity, reason
  - Include comment content and author info
- [ ] `POST /api/admin/moderation/flagged/:id/approve`:
  - Set status to 'approved'
  - Log to ModerationLog
- [ ] `POST /api/admin/moderation/flagged/:id/remove`:
  - Set status to 'removed'
  - Delete or hide the comment
  - Update author's `commentsRemovedCount`
  - Log to ModerationLog
- [ ] `GET /api/admin/moderation/logs`:
  - List moderation actions with pagination
  - Filter by action type, moderator, date range
- [ ] `POST /api/admin/users/:id/shadowban`:
  - Shadowban user with reason
- [ ] `POST /api/admin/users/:id/unshadowban`:
  - Remove shadowban
- [ ] `GET /api/admin/users/:id/history`:
  - User's moderation history (flags, bans, actions taken)

Create `src/pages/admin/ModerationDashboardPage.tsx`:

- [ ] Tabs: Flagged Content | Moderation Log | Shadowbanned Users
- [ ] Flagged Content tab:
  - Filter by status (pending/approved/removed)
  - Filter by severity (high/medium/low)
  - Show: content preview, author, reason, date flagged
  - Actions: Approve, Remove Comment, Shadowban User
  - Bulk actions: Select multiple → Approve All / Remove All
- [ ] Moderation Log tab:
  - Searchable/filterable log of all actions
  - Shows: action, target, moderator, date, reason
- [ ] Shadowbanned Users tab:
  - List of shadowbanned users
  - Show: username, shadowban date, reason
  - Action: Remove shadowban
- [ ] Add to admin navigation

### 5. User History View

- [ ] Add to user detail modal (from Sprint Spam-2):
  - Recent comments (last 20)
  - Flags received
  - Moderation actions on this user
  - Quick actions: Shadowban, Ban, Reset Trust
- [ ] Clicking username anywhere in admin should open this view

### 6. Cloudflare Configuration (FREE)

> **Note**: These are Cloudflare dashboard configurations, not code changes.

- [ ] Enable Bot Fight Mode:
  - Cloudflare Dashboard → Security → Bots → Bot Fight Mode: ON
  - This blocks known bad bots before they reach your server
- [ ] Configure Security Level:
  - Security → Settings → Security Level: Medium (or High if spam is bad)
- [ ] Create WAF Rules (5 free rules):
  - Rule 1: Block requests with suspicious user agents
    ```
    (http.user_agent contains "curl") or
    (http.user_agent contains "python") or
    (http.user_agent contains "wget")
    → Block
    ```
  - Rule 2: Challenge requests to `/api/comments` without referer
    ```
    (http.request.uri.path contains "/api/comments") and
    (not http.referer contains "letaiexplainai.com")
    → Managed Challenge
    ```
  - Rule 3: Rate limit registrations (Cloudflare's free tier)
    ```
    (http.request.uri.path eq "/api/auth/user/register")
    → Rate limit: 5 requests per 10 minutes per IP
    ```
- [ ] Document Cloudflare settings in `.claude/rules/` for future reference

### 7. Logging Service

Create `server/src/services/moderationLogger.ts`:

- [ ] Implement `logAction(action, targetType, targetId, moderatorId, reason, metadata)`:
  - Insert into ModerationLog
  - Include request metadata (IP, user agent) if available
- [ ] Use throughout moderation actions for audit trail

---

## Browser Testing & Validation

### Shadowban - Browser Validation
- [ ] Create test user account
- [ ] Post a comment as test user
- [ ] Admin: shadowban the test user
- [ ] As test user: verify their comment still shows to them
- [ ] Log out, view page as anonymous: verify comment is NOT visible
- [ ] Log in as different user: verify comment is NOT visible
- [ ] Screenshot both perspectives

### Auto-Flagging - Browser Validation
- [ ] Create new account (<7 days old)
- [ ] Post comment containing a URL
- [ ] Check admin flagged content queue
- [ ] Verify comment appears with "new_account_link" reason
- [ ] Screenshot flagged content in admin

### Moderation Dashboard - Browser Validation
- [ ] Navigate to `/admin/moderation`
- [ ] Verify tabs work: Flagged Content, Moderation Log, Shadowbanned
- [ ] In Flagged Content: filter by severity
- [ ] Approve a flagged comment - verify it's removed from pending
- [ ] Remove a flagged comment - verify logged and comment hidden
- [ ] Screenshot each tab

### Cloudflare - Validation
- [ ] Verify Bot Fight Mode is enabled in Cloudflare dashboard
- [ ] Test that legitimate browser requests work normally
- [ ] Document WAF rules that were configured
- [ ] Screenshot Cloudflare security settings

---

## Acceptance Criteria

- [ ] Shadowbanned users can see their own content
- [ ] Other users cannot see shadowbanned users' content
- [ ] Comments are auto-flagged based on risk signals
- [ ] Admin can review flagged content with filters
- [ ] Admin can approve or remove flagged content
- [ ] Admin can shadowban/unshadowban users
- [ ] All moderation actions are logged
- [ ] Admin can view moderation history
- [ ] Cloudflare Bot Fight Mode is enabled
- [ ] Cloudflare WAF rules are configured
- [ ] All browser validation tasks completed with screenshots

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add ModerationLog, FlaggedContent models |
| `server/src/services/shadowbanService.ts` | Create |
| `server/src/services/autoFlagService.ts` | Create |
| `server/src/services/moderationLogger.ts` | Create |
| `server/src/services/commentService.ts` | Modify - shadowban filtering |
| `server/src/routes/admin/moderation.ts` | Create |
| `server/src/routes/comments.ts` | Modify - integrate auto-flagging |
| `src/pages/admin/ModerationDashboardPage.tsx` | Create |
| `.claude/rules/cloudflare.md` | Create - document settings |

---

## Notes for Future Developers

### Shadowban Philosophy
- User should NOT know they're shadowbanned
- Their experience remains normal (they see their content)
- Prevents immediate re-registration when spammers realize they're blocked
- Only use for confirmed spammers, not regular rule violations

### Auto-Flag Tuning
- Start conservative (more false positives is okay)
- Track false positive rate and adjust thresholds
- Add new rules as spam patterns emerge
- Consider time-of-day patterns (spammers often operate in bursts)

### Cloudflare Notes
- Bot Fight Mode may block some legitimate bots (monitoring tools)
- If issues arise, check Cloudflare Firewall Events log
- WAF rules can be adjusted without code deployment
- Free tier: 5 custom WAF rules, consider upgrading if needed

### Bulk Actions Warning
- Bulk approve/remove should require confirmation
- Consider rate limiting bulk actions
- All bulk actions should be logged individually
