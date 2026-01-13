# Anti-Spam & Bot Protection System

Comprehensive documentation of all spam protection measures implemented in the AI Timeline Atlas social features.

## Overview

The spam protection system uses a defense-in-depth approach with multiple layers:

1. **Network Layer** - Cloudflare Bot Fight Mode
2. **Rate Limiting** - Request throttling per user
3. **Content Filtering** - Blocked words and URL limits
4. **Trust System** - Behavioral scoring
5. **Auto-Flagging** - Suspicious content detection
6. **Shadowbanning** - Silent spam mitigation
7. **Vote Integrity** - Vote manipulation prevention

## Implementation Details

### 1. Cloudflare Protection (Network Layer)

**Configuration** (via Cloudflare Dashboard):
- Bot Fight Mode: ON
- Security Level: Always Protected (auto-managed)
- JS Detections: ON

**Location**: Cloudflare Dashboard → Security → Settings

### 2. Rate Limiting (Sprint Spam-1)

**Files**:
- `server/src/services/rateLimiter.ts`
- `server/src/routes/comments.ts`

**Limits**:
| Action | Limit | Window | Tier Modifier |
|--------|-------|--------|---------------|
| Comments | 10 | 1 hour | ×0.5 to ×2.0 |
| Comments | 30 | 24 hours | ×0.5 to ×2.0 |
| Comment Cooldown | 30 seconds | per comment | - |
| Votes | 50 | 1 hour | ×0.5 to ×2.0 |

**Trust Tiers** (affect rate limits):
- `new`: 0-9 trust score → 0.5× limits
- `member`: 10-49 → 1.0× limits
- `trusted`: 50-199 → 1.5× limits
- `veteran`: 200+ → 2.0× limits

### 3. Content Filtering (Sprint Spam-1)

**Files**:
- `server/src/services/contentFilter.ts`
- `SpamFilter` model in `prisma/schema.prisma`

**Features**:
- Maximum 2 URLs per comment
- Admin-configurable blocked domains
- Blocked word patterns (regex supported)

**Admin API**:
```
GET  /api/admin/spam-filters
POST /api/admin/spam-filters
PUT  /api/admin/spam-filters/:id
DELETE /api/admin/spam-filters/:id
```

### 4. Trust System (Sprint Spam-2)

**Files**:
- `server/src/services/trustService.ts`

**Trust Score Calculation**:
```typescript
trustScore =
  (accountAgeDays × 1) +
  (learningActionsCount × 2) +
  (upvotesReceived × 1) -
  (downvotesReceived × 0.5) -
  (commentsRemovedCount × 10)
```

**Requirements to Comment**:
1. Email verified
2. At least 1 learning action completed OR admin override (`canComment = true`)

**User Model Fields**:
- `trustScore`: Calculated trust score
- `learningActionsCount`: Learning engagement count
- `upvotesReceived` / `downvotesReceived`: Vote statistics
- `emailVerifiedAt`: Verification timestamp
- `canComment`: Admin override

### 5. Auto-Flagging System (Sprint Spam-3)

**Files**:
- `server/src/services/autoFlagService.ts`
- `FlaggedContent` model in `prisma/schema.prisma`

**Flag Conditions**:
| Condition | Severity | Reason Code |
|-----------|----------|-------------|
| New account (<7 days) + URLs | HIGH | `new_account_link` |
| Similar text to recent comments | MEDIUM | `similar_text` |
| >5 comments in 10 minutes | MEDIUM | `rapid_posting` |
| Low trust + >500 char comment | LOW | `low_trust_long_comment` |
| User report | VARIES | `user_report` |
| >20 votes in 10 minutes | HIGH | `vote_surge` |

**Admin API**:
```
GET  /api/admin/moderation/flagged
GET  /api/admin/moderation/flagged/counts
POST /api/admin/moderation/flagged/:id/approve
POST /api/admin/moderation/flagged/:id/remove
```

### 6. Shadowbanning (Sprint Spam-3)

**Files**:
- `server/src/services/shadowbanService.ts`

**Behavior**:
- Shadowbanned users can see their own content
- Other users cannot see shadowbanned users' content
- User is NOT notified of shadowban
- Applied to comment lists, user profiles, and counts

**User Model Fields**:
- `isShadowbanned`: Boolean flag
- `shadowbannedAt`: Timestamp
- `shadowbanReason`: Admin note

**Admin API**:
```
GET  /api/admin/moderation/shadowbanned
POST /api/admin/moderation/users/:id/shadowban
POST /api/admin/moderation/users/:id/unshadowban
GET  /api/admin/moderation/users/:id/shadowban-status
```

### 7. Vote Integrity (Sprint Spam-4)

**Files**:
- `server/src/services/votePatternService.ts`
- `server/src/services/commentService.ts` (voteOnComment)

**Protections**:
1. **Self-Vote Prevention**: Users cannot vote on their own comments
2. **Same-IP Detection**: Votes from same IP as author are flagged
3. **Vote Pattern Detection**: Flag if >80% of votes target same author
4. **Vote Brigade Detection**: Flag if >10 votes in 5 minutes

**CommentVote Model Fields**:
- `voterIp`: IP address of voter
- `isSuspicious`: Boolean flag
- `suspiciousReason`: Detection reason

**Comment Model Fields**:
- `legitimateScore`: Score excluding suspicious votes

**Admin API**:
```
GET  /api/admin/moderation/suspicious-votes
POST /api/admin/moderation/votes/:id/clear
GET  /api/admin/moderation/users/:id/voting-patterns
```

## Moderation Audit Trail

**Files**:
- `server/src/services/moderationLogger.ts`
- `ModerationLog` model in `prisma/schema.prisma`

All moderation actions are logged:
- Shadowban/unshadowban
- Content removal
- Flag approval/removal
- Vote flag operations

**Admin API**:
```
GET /api/admin/moderation/logs
GET /api/admin/moderation/logs/target/:type/:id
GET /api/admin/moderation/stats
```

## Threshold Tuning

### Rate Limits
Adjust in `rateLimiter.ts`:
```typescript
const BASE_LIMITS = {
  comment: { perHour: 10, perDay: 30, cooldownMs: 30000 },
  vote: { perHour: 50 },
};
```

### Trust Tiers
Adjust in `trustService.ts`:
```typescript
function getTrustTier(score: number): TrustTier {
  if (score >= 200) return 'veteran';
  if (score >= 50) return 'trusted';
  if (score >= 10) return 'member';
  return 'new';
}
```

### Auto-Flag Thresholds
Adjust in `autoFlagService.ts`:
```typescript
// Account age threshold
if (accountAgeDays < 7 && hasUrls) { ... }

// Similar text threshold
if (similarity > 0.8) { ... }

// Rapid posting threshold
if (recentCommentCount > 5) { ... }
```

### Vote Pattern Thresholds
Adjust in `votePatternService.ts`:
```typescript
// Vote pattern threshold
if (percentage >= 0.8) { ... }

// Vote brigade threshold
if (recentVoteCount > 10) { ... }

// Vote velocity threshold
if (recentVoteCount > 20) { ... }
```

## Monitoring Recommendations

Track these metrics to assess system effectiveness:

1. **Spam Rate**: Flagged comments / Total comments
2. **False Positive Rate**: Approved flags / Total flags
3. **Moderation Queue Size**: Pending flags count
4. **Shadowbanned Users**: Active shadowbans
5. **Suspicious Votes**: Flagged votes count

If spam rate exceeds 10% or moderation queue exceeds 50/day, consider implementing paid solutions documented in `Sprint-Spam-4-Vote-Integrity.md`.

## Future Enhancements

See `roadmap/Sprint-Spam-4-Vote-Integrity.md` for documented paid solutions:

1. **Cloudflare Turnstile** (FREE) - CAPTCHA alternative
2. **reCAPTCHA v3** (Freemium) - Risk scoring
3. **Phone Verification** (~$20/mo) - For trusted status
4. **ML Spam Detection** (~$10-100/mo) - Automated classification
5. **Device Fingerprinting** (~$50/mo) - Multi-account detection
