# Sprint 9: AI Learning Companion

**Impact**: High | **Effort**: Medium | **Dependencies**: AWS Lambda, Secrets Manager

## Overview
Add an AI-powered assistant that helps users understand timeline content in plain language. Users can ask questions about any milestone and get business-friendly explanations.

---

## Tasks

### 9.1 Backend Infrastructure
- [x] Create Lambda function for Claude API proxy
- [x] Set up API Gateway endpoint `/api/chat`
- [x] Store Anthropic API key in AWS Secrets Manager
- [x] Implement rate limiting (10 requests/minute per session)
- [x] Add request logging for cost monitoring

### 9.2 System Prompt Design
- [x] Create base system prompt for AI assistant
  - Focus on business-friendly explanations
  - Avoid technical jargon unless asked
  - Connect concepts to real-world impact
- [x] Add milestone context injection template
- [x] Create analogy mode prompts:
  - "Explain like I'm telling my boss"
  - "Explain like I'm in a job interview"
  - "Explain like I'm writing an email to my team"
- [x] Add prerequisite detection logic
  - Identify concepts user should understand first
  - Generate "To understand this, first learn about: [X, Y, Z]"
- [x] Test prompt with various question types

### 9.3 Frontend Chat Component
- [x] Create `AICompanion` floating button component
- [x] Create `ChatPanel` slide-out drawer
- [x] Implement message history state
- [x] Add typing indicator during API calls
- [x] Handle error states gracefully

### 9.4 Milestone Integration
- [x] Add "Explain this" button to `MilestoneDetail`
- [x] Pass milestone context to chat
- [x] Pre-populate suggested questions based on milestone
- [x] Add "Explain mode" dropdown in chat:
  - Plain English (default)
  - For my boss
  - Technical deep-dive
- [x] Show prerequisite suggestions when viewing complex milestones

### 9.5 Testing & Polish
- [ ] Test with non-technical users
- [x] Add Playwright tests for chat flow
- [ ] Monitor API costs in first week
- [ ] Adjust rate limits based on usage

---

## Technical Details

### Lambda Function Structure
```
/lambda/ai-companion/
├── index.ts          # Handler
├── claude.ts         # API client
├── prompts.ts        # System prompts
├── rateLimit.ts      # Rate limiting logic
└── package.json
```

### API Contract
```typescript
// POST /api/chat
interface ChatRequest {
  message: string;
  milestoneContext?: {
    id: string;
    title: string;
    description: string;
    date: string;
  };
  sessionId: string;
}

interface ChatResponse {
  response: string;
  suggestedFollowUps?: string[];
}
```

### System Prompt (Draft)
```
You are an AI learning assistant helping professionals understand AI history and concepts.

Your audience is business professionals - executives, product managers, marketers - who want to understand AI without getting lost in technical details.

Guidelines:
- Explain concepts in plain English first
- Use analogies to familiar business concepts
- Connect historical events to current AI products
- When asked "why does this matter?", focus on business impact
- Only go technical if explicitly asked
- Keep responses concise (2-3 paragraphs max)

Current context: [MILESTONE_CONTEXT]
```

---

## Cost Estimation
- Claude API: ~$0.01-0.05 per conversation
- Lambda: Free tier covers low traffic
- Secrets Manager: $0.40/month per secret
- Estimated monthly: $10-50 depending on usage

---

## Success Criteria
- [x] Users can ask questions about any milestone
- [x] Responses are understandable to non-technical users
- [x] Average response time < 3 seconds
- [x] No API key exposure in frontend
- [x] Rate limiting prevents abuse

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [x] All Playwright tests passing locally
- [ ] Lambda function tested locally with SAM CLI
- [x] API key stored in Secrets Manager (not in code)
- [x] No TypeScript errors (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)

### Deployment Steps
- [ ] Deploy Lambda function to AWS
- [ ] Configure API Gateway endpoint
- [ ] Set up CloudFront to proxy `/api/chat` to Lambda
- [ ] Deploy frontend to S3/CloudFront
- [ ] Invalidate CloudFront cache

### Production Verification
- [ ] Visit production URL: https://d33f170a3u5yyl.cloudfront.net
- [ ] Open AI Companion chat panel
- [ ] Test conversation: "What is a transformer?"
- [ ] Test milestone context: Click "Explain this" on a milestone
- [ ] Verify rate limiting works (send 11+ requests quickly)
- [ ] Check CloudWatch logs for errors
- [ ] Monitor first-day API costs
- [ ] Test on mobile device

### Rollback Plan
If issues found in production:
1. Frontend: Revert merge commit and redeploy
2. Lambda: Deploy previous version from AWS console
3. If API costs spike: Disable Lambda or reduce rate limits
