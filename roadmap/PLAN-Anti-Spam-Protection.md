# Anti-Spam & Bot Protection System

> **Project Overview**: Implement comprehensive protections against spam, bots, vote manipulation, and abuse for AI Timeline Atlas social features.

## Goals

1. Protect comment threads from spam bots and link farmers
2. Prevent vote manipulation and sock puppet attacks
3. Build trust-based system that rewards legitimate users
4. Provide admin tools for efficient moderation
5. **Use only FREE or very cheap solutions** (paid solutions documented for future)

## Infrastructure Context

- **Hosting**: Cloudflare (free tier has Bot Fight Mode, security rules)
- **Backend**: AWS Lambda + API Gateway
- **Database**: PostgreSQL via Prisma
- **Auth**: JWT with access/refresh tokens

## Sprint Overview

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| **Spam-1** | Rate Limiting & Basic Protections | Rate limits, honeypots, link filtering |
| **Spam-2** | Account Trust & Verification | Email verification gate, trust scores, new account restrictions |
| **Spam-3** | Shadowbanning & Moderation | Shadowban, auto-flagging, moderation dashboard, Cloudflare config |
| **Spam-4** | Vote Integrity & Future Planning | Vote protection, suspicious pattern detection, future roadmap |

## Database Schema Additions

```prisma
// Add to User model
model User {
  // ... existing fields

  // Rate limiting
  lastCommentAt         DateTime?
  hourlyCommentCount    Int       @default(0)
  hourlyCommentResetAt  DateTime?
  dailyCommentCount     Int       @default(0)
  dailyCommentResetAt   DateTime?
  hourlyVoteCount       Int       @default(0)
  hourlyVoteResetAt     DateTime?

  // Trust & Moderation
  trustScore            Float     @default(0)
  isShadowbanned        Boolean   @default(false)
  isBanned              Boolean   @default(false)
  banReason             String?
  banExpiresAt          DateTime?

  // Verification
  emailVerifiedAt       DateTime?
  canComment            Boolean   @default(false)  // Unlocked after gate

  // Stats for trust calculation
  totalUpvotesReceived    Int     @default(0)
  totalDownvotesReceived  Int     @default(0)
  commentsRemovedCount    Int     @default(0)
  learningActionsCount    Int     @default(0)  // Flashcards, quizzes, etc.
}

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

model ModerationLog {
  id            String   @id @default(cuid())
  moderatorId   String?  // null if automated
  action        String   // 'ban', 'shadowban', 'remove_comment', 'flag', 'unflag'
  targetType    String   // 'user', 'comment'
  targetId      String
  reason        String?
  automated     Boolean  @default(false)
  metadata      Json?
  createdAt     DateTime @default(now())

  @@index([targetType, targetId])
  @@index([createdAt])
}

model FlaggedContent {
  id          String   @id @default(cuid())
  contentType String   // 'comment'
  contentId   String
  reason      String   // 'new_account_link', 'similar_text', 'rapid_posting', 'user_report'
  status      String   @default("pending")  // 'pending', 'approved', 'removed'
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([status, createdAt])
  @@unique([contentType, contentId])
}
```

## Sprint Documents

- [Sprint Spam-1: Rate Limiting & Basic Protections](./Sprint-Spam-1-Rate-Limiting.md)
- [Sprint Spam-2: Account Trust & Verification](./Sprint-Spam-2-Account-Trust.md)
- [Sprint Spam-3: Shadowbanning & Moderation Tools](./Sprint-Spam-3-Shadowbanning-Moderation.md)
- [Sprint Spam-4: Vote Integrity & Future Planning](./Sprint-Spam-4-Vote-Integrity.md)

## Cost Analysis

| Solution | Cost | Sprint |
|----------|------|--------|
| Rate limiting (server-side) | FREE | 1 |
| Honeypot fields | FREE | 1 |
| Link filtering | FREE | 1 |
| Email verification | FREE (existing) | 2 |
| Trust score system | FREE | 2 |
| Shadowbanning | FREE | 3 |
| Cloudflare Bot Fight Mode | FREE | 3 |
| Cloudflare Security Rules | FREE (5 rules) | 3 |
| Vote integrity checks | FREE | 4 |
| **Cloudflare Turnstile** | FREE | Future |
| reCAPTCHA v3 | Freemium | Future |
| Phone verification | $$ | Future |
| ML spam detection | $$$ | Future |

## Success Metrics

- Spam comments blocked before posting: >95%
- False positive rate (legitimate users blocked): <1%
- Average time to moderate flagged content: <24 hours
- User reports resolved: 100%
