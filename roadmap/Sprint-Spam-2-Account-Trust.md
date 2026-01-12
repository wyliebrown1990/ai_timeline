# Sprint Spam-2: Account Trust & Verification

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Implement account trust system and verification gates. New accounts must prove they're legitimate before gaining full commenting privileges. Trust scores reward good behavior with relaxed limits.

**Cost: FREE** - All features use existing infrastructure.

## Prerequisites

- Sprint Spam-1 complete (rate limiting in place)
- Email verification infrastructure exists (Sprint LEarn-3)

---

## Tasks

### 1. Database Schema Updates

- [ ] Add trust and verification fields to User model:
  ```prisma
  // Trust & Engagement
  trustScore              Float     @default(0)
  canComment              Boolean   @default(false)
  commentUnlockedAt       DateTime?

  // Stats for trust calculation
  totalUpvotesReceived    Int       @default(0)
  totalDownvotesReceived  Int       @default(0)
  commentsRemovedCount    Int       @default(0)
  learningActionsCount    Int       @default(0)

  // Verification tracking
  emailVerifiedAt         DateTime?
  ```
- [ ] Run migration: `npx prisma migrate dev --name add_trust_system`
- [ ] Deploy migration to production

### 2. Email Verification Gate

- [ ] Update `server/src/routes/comments.ts`:
  - Check `emailVerifiedAt` is not null before allowing comments
  - Return 403 with message: "Please verify your email to comment"
- [ ] Update `server/src/services/auth/authService.ts`:
  - Set `emailVerifiedAt` when email is verified
- [ ] Update frontend CommentForm:
  - Show "Verify your email to comment" message with resend link
  - Link to email verification flow

### 3. New Account Gate (Choose One)

**Option A: 24-Hour Wait**
- [ ] In comment route, check if `createdAt` is at least 24 hours ago
- [ ] If not, return 403: "New accounts must wait 24 hours before commenting"
- [ ] Show countdown in frontend

**Option B: Learning Action Gate (Recommended)**
- [ ] Track learning actions in `learningActionsCount`:
  - Viewing a milestone detail page (+1)
  - Completing a flashcard session (+2)
  - Taking a quiz (+3)
- [ ] Require at least 1 learning action before commenting
- [ ] Update relevant frontend components to call increment endpoint
- [ ] Create endpoint `POST /api/user/learning-action`:
  ```typescript
  { actionType: 'milestone_view' | 'flashcard_complete' | 'quiz_complete' }
  ```
- [ ] In comment route, check `learningActionsCount >= 1` OR `canComment === true`
- [ ] Show "Complete a learning activity to unlock comments" in CommentForm

### 4. Trust Score Calculation

Create `server/src/services/trustService.ts`:

- [ ] Implement `calculateTrustScore(userId)`:
  ```typescript
  const score = (
    accountAgeDays * 0.5 +                    // Max ~180 points for 1 year
    totalUpvotesReceived * 1.0 +              // Direct reputation
    learningActionsCount * 2.0 +              // Engagement with educational content
    (hasVerifiedEmail ? 10 : 0)               // Verification bonus
  ) - (
    totalDownvotesReceived * 0.5 +            // Penalty for bad content
    commentsRemovedCount * 15 +               // Strong penalty for removed content
    (reportsReceivedCount * 5)                // Penalty for being reported
  );
  return Math.max(0, score);  // Floor at 0
  ```
- [ ] Implement `updateTrustScore(userId)`: Recalculate and save
- [ ] Implement `getTrustTier(score)`:
  ```typescript
  if (score < 10) return 'new';        // Strict limits
  if (score < 50) return 'member';     // Normal limits
  if (score < 200) return 'trusted';   // Relaxed limits
  return 'veteran';                     // Very relaxed limits
  ```

### 5. Trust-Based Rate Limits

- [ ] Update `server/src/services/rateLimiter.ts`:
  - Accept trust tier as parameter
  - Apply different limits based on tier:

  | Tier | Comments/Hour | Comments/Day | Votes/Hour | Cooldown |
  |------|---------------|--------------|------------|----------|
  | new | 5 | 15 | 25 | 60s |
  | member | 10 | 30 | 50 | 30s |
  | trusted | 20 | 60 | 100 | 15s |
  | veteran | 30 | 100 | 150 | 10s |

- [ ] Update comment route to fetch user's trust tier and apply appropriate limits

### 6. Update Stats on Actions

- [ ] When a comment receives an upvote:
  - Increment author's `totalUpvotesReceived`
  - Trigger trust score recalculation
- [ ] When a comment receives a downvote:
  - Increment author's `totalDownvotesReceived`
  - Trigger trust score recalculation
- [ ] When a comment is removed by admin:
  - Increment author's `commentsRemovedCount`
  - Trigger trust score recalculation
- [ ] Update `server/src/services/commentService.ts` vote handlers

### 7. Admin: User Trust Dashboard

- [ ] Create endpoint `GET /api/admin/users`:
  - List users with trust scores
  - Support sorting by trust score, account age, comment count
  - Support filtering by trust tier
- [ ] Create endpoint `GET /api/admin/users/:id`:
  - Full user details including trust breakdown
  - Recent comments, votes received, reports
- [ ] Create admin page `src/pages/admin/UserManagementPage.tsx`:
  - Table: username, email, trust score, tier, account age, comments
  - Click to see user detail modal
  - Actions: grant commenting permission, reset trust score
- [ ] Add to admin navigation

### 8. Frontend: Trust Indicators

- [ ] Show trust tier badge on user's own profile
- [ ] In CommentForm, show current rate limits based on tier
- [ ] Show progress toward next tier (optional, gamification)

---

## Browser Testing & Validation

### Email Verification Gate - Browser Validation
- [ ] Create new account (or use unverified test account)
- [ ] Try to post a comment
- [ ] Verify "verify email" message appears
- [ ] Verify email
- [ ] Confirm can now access comment form
- [ ] Screenshot both states

### Learning Action Gate - Browser Validation
- [ ] Create new account with verified email
- [ ] Try to post comment - should show "complete learning activity" message
- [ ] Navigate to a milestone detail page
- [ ] Return to comments - should now be unlocked
- [ ] Screenshot the unlock flow

### Trust Score - Browser Validation
- [ ] Log in as admin
- [ ] Navigate to `/admin/users`
- [ ] Verify user list loads with trust scores
- [ ] Click on a user to see details
- [ ] Verify trust breakdown is shown
- [ ] Screenshot admin interface

### Rate Limit Tiers - Browser Validation
- [ ] As a new user (low trust), verify stricter rate limits
- [ ] Post 5 comments in an hour - should be rate limited
- [ ] Check that rate limit message reflects "new" tier limits
- [ ] Screenshot rate limit message

---

## Acceptance Criteria

- [ ] Users must verify email before commenting
- [ ] New users must complete 1 learning action before commenting
- [ ] Trust score is calculated based on account age, votes, engagement
- [ ] Rate limits scale with trust tier
- [ ] Admin can view all users with trust scores
- [ ] Admin can see detailed trust breakdown per user
- [ ] Vote actions update author's trust stats
- [ ] Comment removal updates author's trust stats
- [ ] All browser validation tasks completed with screenshots

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add trust fields |
| `server/src/services/trustService.ts` | Create - trust calculation |
| `server/src/services/rateLimiter.ts` | Modify - tier-based limits |
| `server/src/routes/comments.ts` | Modify - verification gates |
| `server/src/routes/admin/users.ts` | Create - user management endpoints |
| `server/src/services/commentService.ts` | Modify - update stats on votes |
| `src/pages/admin/UserManagementPage.tsx` | Create - admin UI |
| `src/components/Comments/CommentForm.tsx` | Modify - verification messages |

---

## Notes for Future Developers

### Trust Score Philosophy
- Positive actions add points, negative actions subtract
- Learning engagement is weighted heavily (ties social features to educational mission)
- Removed comments are heavily penalized (spam deterrent)
- Score can never go below 0

### Why Learning Action Gate?
- Spammers want quick account → spam cycle
- Requiring educational engagement adds friction for bots
- Legitimate users naturally browse before commenting
- Reinforces that this is an educational platform, not a forum

### Trust Score Recalculation
- Currently recalculated on each action
- For scale, could batch calculate nightly
- Consider caching trust tier (changes infrequently)

### Admin Override
- Admin can manually set `canComment = true` to bypass gates
- Useful for known legitimate users who had issues
