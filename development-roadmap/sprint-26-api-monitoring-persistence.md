# Sprint 26: API Monitoring Persistence (MVP)

**Impact**: Medium | **Effort**: Low | **Dependencies**: Sprint 16 (Admin Panel)

## Overview

Add persistent storage for API usage monitoring to the admin panel. Currently, stats are stored in Lambda's in-memory array and lost on each cold start. This sprint implements cost-effective persistence using CloudWatch Logs (already being written) and optionally DynamoDB for aggregated daily stats.

**Design Principle**: MVP with minimal cost - use existing CloudWatch Logs first, add DynamoDB only if needed.

---

## Cost Analysis

| Approach | Monthly Cost Estimate | Pros | Cons |
|----------|----------------------|------|------|
| **CloudWatch Logs Insights** | ~$0.005/query | Already logging, no new infra | Query latency (~2-5s), 15-min log delay |
| **DynamoDB On-Demand** | ~$0.25-1.00 | Fast queries, real-time | New table, more code |
| **Both (Recommended)** | ~$0.50-1.50 | Best of both | Slightly more complexity |

**Recommendation**: Use CloudWatch Logs Insights for historical data (already free since we're logging), add DynamoDB only for real-time session tracking if needed.

---

## Tasks

### 26.1 CloudWatch Logs Query Integration
- [x] Create `server/src/services/cloudwatchLogs.ts` service
- [x] Implement `queryRecentChatLogs(hours: number)` using CloudWatch Logs Insights
- [x] Parse `[CHAT_LOG]` entries from Lambda log group
- [x] Handle query pagination for large result sets
- [x] Add IAM permissions to Lambda role for `logs:StartQuery`, `logs:GetQueryResults`
- [ ] Test query performance (should be <5s for last 24 hours)

### 26.2 Update Admin Stats Endpoint
- [x] Modify `/api/chat/admin-stats` to query CloudWatch Logs
- [x] Keep in-memory stats for real-time data (last few minutes)
- [x] Merge CloudWatch historical data with in-memory recent data
- [x] Add `timeRange` query parameter (1h, 24h, 7d, 30d)
- [x] Cache CloudWatch query results for 5 minutes to reduce costs

### 26.3 Enhanced Logging Format
- [x] Update `logChatRequest()` to include additional fields:
  - `requestType`: 'chat' | 'prerequisites' | 'follow-ups'
  - `explainMode`: which mode was used
  - `milestoneId`: if milestone context was provided
  - `errorType`: categorized error (rate_limit, api_error, timeout, etc.)
- [x] Ensure structured JSON format for easy parsing
- [x] Add request ID for tracing

### 26.4 Rate Limit Persistence (Optional - DynamoDB)
- [ ] Create `ApiStats` DynamoDB table (on-demand billing)
  - Partition key: `date` (YYYY-MM-DD)
  - Sort key: `hour` (HH)
  - Attributes: requestCount, errorCount, uniqueSessions, totalTokens, etc.
- [ ] Write hourly aggregates from Lambda (batch writes)
- [ ] Query for dashboard charts
- [ ] TTL: 90 days for automatic cleanup

### 26.5 Frontend Dashboard Enhancements
- [x] Add time range selector (1h, 24h, 7d, 30d)
- [x] Show loading state while CloudWatch query runs
- [ ] Add auto-refresh toggle (off by default to save costs)
- [x] Display "Data from X minutes ago" timestamp
- [ ] Add simple line chart for requests over time
- [ ] Show peak usage times

### 26.6 Error Alerting (Stretch Goal)
- [ ] Create CloudWatch Alarm for error rate > 10%
- [ ] Create CloudWatch Alarm for rate limit hits > 50/hour
- [ ] SNS topic for email notifications
- [ ] Add alarm status to admin dashboard

---

## Technical Implementation

### CloudWatch Logs Insights Query

```typescript
// server/src/services/cloudwatchLogs.ts

import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({ region: 'us-east-1' });
const LOG_GROUP = '/aws/lambda/ai-timeline-api-prod';

export async function queryRecentChatLogs(hours: number = 24): Promise<ChatLogEntry[]> {
  const endTime = Date.now();
  const startTime = endTime - (hours * 60 * 60 * 1000);

  const query = `
    fields @timestamp, @message
    | filter @message like /\\[CHAT_LOG\\]/
    | parse @message '"sessionId":"*"' as sessionId
    | parse @message '"inputTokens":*,' as inputTokens
    | parse @message '"outputTokens":*,' as outputTokens
    | parse @message '"success":*,' as success
    | parse @message '"duration":*,' as duration
    | parse @message '"error":"*"' as error
    | sort @timestamp desc
    | limit 1000
  `;

  const startQuery = await client.send(new StartQueryCommand({
    logGroupName: LOG_GROUP,
    startTime: Math.floor(startTime / 1000),
    endTime: Math.floor(endTime / 1000),
    queryString: query,
  }));

  // Poll for results (queries are async)
  let results;
  let status = 'Running';
  while (status === 'Running' || status === 'Scheduled') {
    await new Promise(resolve => setTimeout(resolve, 500));
    const response = await client.send(new GetQueryResultsCommand({
      queryId: startQuery.queryId,
    }));
    status = response.status || 'Complete';
    results = response.results;
  }

  return parseQueryResults(results || []);
}
```

### DynamoDB Table Schema (If Needed)

```yaml
# infra/template.yaml addition

ApiStatsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ai-timeline-api-stats
    BillingMode: PAY_PER_REQUEST  # On-demand, pay only for what you use
    AttributeDefinitions:
      - AttributeName: date
        AttributeType: S
      - AttributeName: hour
        AttributeType: S
    KeySchema:
      - AttributeName: date
        KeyType: HASH
      - AttributeName: hour
        KeyType: RANGE
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
```

### Enhanced Log Entry Format

```typescript
interface EnhancedChatLogEntry {
  timestamp: string;
  requestId: string;           // UUID for tracing
  sessionId: string;
  requestType: 'chat' | 'prerequisites' | 'follow-ups';
  inputTokens: number;
  outputTokens: number;
  model: string;
  duration: number;
  success: boolean;
  error?: string;
  errorType?: 'rate_limit' | 'api_error' | 'timeout' | 'auth' | 'unknown';
  explainMode?: string;
  milestoneId?: string;
}
```

### Frontend Time Range Selector

```typescript
// src/pages/admin/ApiMonitoringPage.tsx

const TIME_RANGES = [
  { label: '1 Hour', value: 1 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
  { label: '30 Days', value: 720 },
];

// Add to component
const [timeRange, setTimeRange] = useState(24);
const [isLoading, setIsLoading] = useState(false);

// Query with time range
const fetchStats = async () => {
  setIsLoading(true);
  const response = await fetch(`/api/chat/admin-stats?hours=${timeRange}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // ...
};
```

---

## IAM Permissions Required

Add to Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:StartQuery",
        "logs:GetQueryResults",
        "logs:StopQuery"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/ai-timeline-api-prod:*"
    }
  ]
}
```

---

## File Changes

```
server/src/
├── services/
│   ├── cloudwatchLogs.ts      # NEW - CloudWatch Logs Insights queries (DONE)
│   └── claude.ts              # UPDATE - Enhanced logging format (DONE)
├── controllers/
│   └── chat.ts                # UPDATE - Query CloudWatch for stats (DONE)
infra/
└── template.yaml              # UPDATE - Add IAM permissions (DONE)

src/pages/admin/
└── ApiMonitoringPage.tsx      # UPDATE - Time range selector, data source indicator (DONE)
```

---

## Success Criteria

- [x] Admin dashboard shows historical stats (not just current Lambda instance)
- [x] Data persists across Lambda cold starts
- [x] Time range selector works (1h, 24h, 7d, 30d)
- [ ] Query response time < 5 seconds
- [x] Monthly cost < $2 for typical usage
- [x] Error breakdown by type is accurate
- [ ] Stats match CloudWatch logs (spot check validation)

---

## Deployment Checklist

### Pre-Deployment
- [x] `npm run typecheck` passes
- [x] SAM build succeeds
- [x] IAM permissions tested in dev
- [ ] CloudWatch Logs query tested manually

### Production Deployment
- [x] Deploy Lambda with new CloudWatch permissions
- [x] Deploy frontend with time range selector
- [ ] Verify admin dashboard loads historical data
- [ ] Make test chat requests, verify they appear in stats
- [ ] Check CloudWatch for any permission errors

### Post-Deployment
- [ ] Monitor CloudWatch Logs Insights costs
- [ ] Verify query caching reduces repeated queries
- [ ] Document how to add new metrics

---

## Estimated Costs

| Component | Usage | Cost |
|-----------|-------|------|
| CloudWatch Logs Insights | ~50 queries/day | $0.25/month |
| CloudWatch Logs Storage | Already included | $0.00 |
| DynamoDB (if added) | ~1000 writes/day | $0.25/month |
| **Total** | | **~$0.50/month** |

---

## Future Considerations (Not in MVP)

1. **Grafana Dashboard** - More sophisticated visualization
2. **Cost Alerts** - Notify when API spend exceeds threshold
3. **User-Level Stats** - Track per-session usage patterns
4. **A/B Testing Metrics** - Compare different prompt strategies
5. **Export to CSV** - Download stats for external analysis
