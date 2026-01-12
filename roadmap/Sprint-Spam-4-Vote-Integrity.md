# Sprint Spam-4: Vote Integrity & Future Planning

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [DATE] by [DEVELOPER]

## Overview

Implement vote manipulation protections and document future paid solutions for when scale demands them. This sprint completes the FREE anti-spam system.

**Cost: FREE** - All implementations in this sprint are server-side logic.

## Prerequisites

- Sprint Spam-1 through Spam-3 complete
- Voting system functional (Sprint LEarn-4)

---

## Tasks

### 1. Vote Integrity: IP-Based Deduplication

- [ ] Capture IP address on vote requests:
  - Update vote endpoint to extract `x-forwarded-for` or `req.ip`
  - Store IP with vote record (add `voterIp` field to CommentVote model if not exists)
- [ ] Add check in `voteOnComment()`:
  ```typescript
  // Don't count vote if from same IP as comment author
  const comment = await getComment(commentId);
  const authorLastIp = await getUserLastIp(comment.authorId);
  if (voterIp === authorLastIp) {
    // Still save the vote (user sees it) but flag it
    await createVote({ ...data, isSuspicious: true });
    return { success: true, flagged: true };
  }
  ```
- [ ] Suspicious votes don't count toward displayed score
- [ ] Add `isSuspicious` and `voterIp` fields to CommentVote model:
  ```prisma
  model CommentVote {
    // ... existing fields
    voterIp       String?
    isSuspicious  Boolean  @default(false)
  }
  ```
- [ ] Run migration

### 2. Vote Pattern Detection

Create `server/src/services/votePatternService.ts`:

- [ ] Implement `detectSuspiciousVoting(voterId)`:
  - Check if user always votes on same author's content
  - Flag if >80% of votes in last 7 days target same author
- [ ] Implement `detectVoteBrigade(commentId)`:
  - Check for unusual vote velocity
  - Flag if comment gets >10 votes in 5 minutes from different accounts
- [ ] Implement `flagSuspiciousVotes(voteIds, reason)`:
  - Mark votes as suspicious
  - Log to moderation system
- [ ] Run detection on vote creation:
  ```typescript
  // After creating vote
  const patterns = await detectSuspiciousVoting(userId);
  if (patterns.isSuspicious) {
    await flagSuspiciousVotes([vote.id], patterns.reason);
  }
  ```

### 3. Vote Score Calculation

- [ ] Update score calculation to exclude suspicious votes:
  ```typescript
  const score = await prisma.commentVote.aggregate({
    where: {
      commentId,
      isSuspicious: false  // Only count legitimate votes
    },
    _sum: { value: true }
  });
  ```
- [ ] Add `legitimateScore` field to Comment for caching:
  ```prisma
  model Comment {
    // ... existing
    legitimateScore  Int  @default(0)  // Cached score excluding suspicious votes
  }
  ```
- [ ] Update score on vote changes

### 4. Admin: Vote Monitoring

- [ ] Add to moderation dashboard:
  - Tab: "Suspicious Votes"
  - Show: voter, target comment, reason flagged, date
  - Action: Confirm suspicious (keeps flagged), Clear flag
- [ ] Add endpoint `GET /api/admin/moderation/suspicious-votes`:
  - List suspicious votes with pagination
  - Include voter info, comment info
- [ ] Add endpoint `POST /api/admin/moderation/votes/:id/clear`:
  - Remove suspicious flag
  - Recalculate affected comment scores
- [ ] Add user detail: show voting patterns
  - "This user has voted on User X 47 times (92% of their votes)"

### 5. Self-Vote Prevention

- [ ] Add check in vote endpoint:
  ```typescript
  if (comment.authorId === voterId) {
    return res.status(400).json({
      error: 'You cannot vote on your own comment'
    });
  }
  ```
- [ ] Frontend should hide vote buttons on own comments (UX)

### 6. Vote Velocity Limits

- [ ] Implement per-comment velocity check:
  - If comment receives >20 votes in 10 minutes, flag for review
  - Don't prevent votes, but alert admins
- [ ] Add to auto-flag system:
  ```typescript
  const recentVotes = await countRecentVotes(commentId, 10); // Last 10 min
  if (recentVotes > 20) {
    await flagContent('comment', commentId, 'vote_surge', 'high');
  }
  ```

### 7. Documentation: Current System Summary

- [ ] Create `.claude/rules/spam-protection.md`:
  - Document all protections implemented
  - Configuration options
  - How to tune thresholds
  - Monitoring recommendations

---

## Browser Testing & Validation

### Self-Vote Prevention - Browser Validation
- [ ] Log in as user with a comment
- [ ] Navigate to their own comment
- [ ] Verify vote buttons are hidden or disabled
- [ ] Try to vote via API (should return 400)
- [ ] Screenshot UI state

### Suspicious Vote Display - Browser Validation
- [ ] As admin, navigate to moderation dashboard
- [ ] Go to Suspicious Votes tab
- [ ] Verify suspicious votes are listed (may need to seed test data)
- [ ] Clear a flag and verify it's removed
- [ ] Screenshot the interface

### Vote Pattern Detection - Browser Validation
- [ ] Create test scenario: User A votes on 10 comments by User B
- [ ] Verify pattern is detected and flagged
- [ ] Check admin can see the pattern in user details
- [ ] Screenshot user voting pattern view

---

## Acceptance Criteria

- [ ] Votes from same IP as comment author are flagged suspicious
- [ ] Suspicious votes don't count toward displayed score
- [ ] Users cannot vote on their own comments
- [ ] Vote brigades (sudden vote surges) are detected and flagged
- [ ] Admin can view and manage suspicious votes
- [ ] Admin can see user voting patterns
- [ ] All protections are documented
- [ ] All browser validation tasks completed with screenshots

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add vote tracking fields |
| `server/src/services/votePatternService.ts` | Create |
| `server/src/services/commentService.ts` | Modify - suspicious vote filtering |
| `server/src/routes/comments.ts` | Modify - self-vote check, IP capture |
| `server/src/routes/admin/moderation.ts` | Modify - add vote endpoints |
| `src/pages/admin/ModerationDashboardPage.tsx` | Modify - add Suspicious Votes tab |
| `.claude/rules/spam-protection.md` | Create - system documentation |

---

## Future Considerations (Paid Solutions)

> **These solutions require ongoing costs. Implement when scale demands them.**

### Cloudflare Turnstile (FREE Alternative to reCAPTCHA)

**What it is**: Cloudflare's privacy-focused CAPTCHA alternative. Completely FREE.

**When to implement**: If bot registrations become a problem despite current protections.

**Implementation**:
```typescript
// Frontend: Add Turnstile widget to registration form
<Turnstile siteKey={CF_TURNSTILE_SITE_KEY} onSuccess={setToken} />

// Backend: Verify token
const verifyResponse = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    body: JSON.stringify({
      secret: CF_TURNSTILE_SECRET,
      response: token
    })
  }
);
```

**Cost**: FREE (part of Cloudflare free tier)

**Priority**: HIGH - Should be first paid/freemium solution to implement

---

### reCAPTCHA v3 (Freemium)

**What it is**: Google's invisible CAPTCHA that scores requests 0-1.

**When to implement**: If Turnstile isn't sufficient or you want secondary verification.

**Cost**:
- Free: 1M assessments/month
- Paid: $1 per 1000 assessments after that

**Implementation**:
```typescript
// Score-based - no user interaction
const score = await verifyRecaptcha(token);
if (score < 0.5) {
  // Suspicious - require additional verification or block
}
```

**Priority**: MEDIUM - Use as backup to Turnstile

---

### Phone Verification (Paid)

**What it is**: Require phone number to verify account for elevated privileges.

**When to implement**: If sock puppet accounts become a significant problem.

**Services**:
- Twilio Verify: ~$0.05 per verification
- AWS SNS: ~$0.00645 per SMS (US)

**Implementation**:
- Only require for certain actions (becoming "trusted" user)
- Not required for basic commenting

**Cost**: $5-50/month depending on volume

**Priority**: LOW - Only if sock puppets become major issue

---

### ML-Based Spam Detection (Paid)

**What it is**: AI models that classify content as spam/not spam.

**Options**:
1. **OpenAI Moderation API**: FREE but limited
2. **Claude API**: ~$0.003 per comment (using Haiku)
3. **Perspective API (Google)**: FREE for limited use

**When to implement**: If manual moderation becomes overwhelming.

**Implementation**:
```typescript
// Example with Claude Haiku
const isSpam = await analyzeWithClaude(commentText);
if (isSpam.confidence > 0.8) {
  await flagContent('comment', id, 'ml_spam_detection', 'high');
}
```

**Cost**: $10-100/month depending on volume

**Priority**: MEDIUM - After volume justifies automation

---

### Device Fingerprinting (Paid)

**What it is**: Identify devices across sessions to detect multi-accounting.

**Services**:
- FingerprintJS Pro: $0.002 per identification
- Castle.io: Custom pricing

**When to implement**: If multi-account abuse is confirmed problem.

**Cost**: $20-200/month depending on volume

**Priority**: LOW - Very advanced, only if other solutions fail

---

### IP Intelligence (Paid)

**What it is**: Identify VPNs, proxies, data centers, and known bad IPs.

**Services**:
- IPQualityScore: From $20/month
- MaxMind: From $0.10 per 1000 queries
- Cloudflare (with paid plan): Included

**When to implement**: If bots are evading IP-based rate limits.

**Priority**: LOW - Current Cloudflare free tier provides basic protection

---

## Implementation Priority for Paid Solutions

| Solution | Cost | Priority | Trigger Condition |
|----------|------|----------|-------------------|
| Cloudflare Turnstile | FREE | HIGH | Bot registrations >5% |
| reCAPTCHA v3 | Freemium | MEDIUM | Turnstile insufficient |
| OpenAI Moderation | FREE | MEDIUM | Spam >10% of comments |
| Claude Haiku Moderation | ~$10/mo | MEDIUM | Moderation queue >50/day |
| Phone Verification | ~$20/mo | LOW | Sock puppets confirmed |
| Device Fingerprinting | ~$50/mo | LOW | Multi-account abuse |
| IP Intelligence | ~$20/mo | LOW | Sophisticated bot attacks |

---

## Notes for Future Developers

### Monitoring Spam Levels
Track these metrics to know when to upgrade:
- Spam comments per day (should be <5% of total)
- Bot registrations (watch for patterns)
- Moderation queue size (should be manageable)
- False positive rate (legitimate users blocked)

### Gradual Rollout
When implementing paid solutions:
1. Start with lowest tier/free trial
2. Measure impact on spam rates
3. Calculate cost per spam blocked
4. Scale up only if ROI is positive

### Defense in Depth
Current FREE system provides multiple layers:
1. Cloudflare (network level)
2. Rate limiting (application level)
3. Content filtering (content level)
4. Trust system (behavioral level)
5. Shadowbanning (response level)

This should handle most abuse. Paid solutions are for scale or sophisticated attacks.
