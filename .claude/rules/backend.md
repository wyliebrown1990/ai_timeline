---
paths: infra/**/*.{ts,yaml,yml}, apps/api/**/*.ts
---

# Backend & Infrastructure Rules

## AWS Services Architecture

### API Layer
- Use **Lambda Function URLs** with CloudFront for simple REST endpoints
- Or **API Gateway REST API** for more complex routing needs
- Implement request validation at the API Gateway level
- Use Lambda Powertools for logging, tracing, and metrics

### Database (DynamoDB)
- Single-table design pattern for related entities
- Use GSIs (Global Secondary Indexes) for query patterns
- Partition key design: balance between distribution and query efficiency
- Enable Point-in-Time Recovery for production

### Search (OpenSearch Serverless)
- Index events, concepts, people, orgs for full-text search
- Use collection policies for cost management
- Implement faceted search for filters
- Keep DynamoDB as source of truth, OpenSearch for search

### Media Storage (S3 + CloudFront)
- Store images, diagrams, and static assets in S3
- Use CloudFront for global CDN distribution
- Implement signed URLs for any non-public assets
- Enable S3 versioning for content recovery

## DynamoDB Table Design

### Primary Table: `AITimelineData`

```
PK (Partition Key)          SK (Sort Key)              Attributes
-----------------------     -----------------------    ------------------
EVENT#<id>                  META                       title, date_start, date_end, era, summary_md, ...
EVENT#<id>                  CONCEPT#<concept_id>       (relationship)
EVENT#<id>                  PERSON#<person_id>         (relationship)
CONCEPT#<id>                META                       name, definition_md, ...
CONCEPT#<id>                PREREQ#<concept_id>        (relationship)
PERSON#<id>                 META                       name, bio_md, links, ...
ORG#<id>                    META                       name, bio_md, links, ...
ERA#<id>                    META                       name, start_year, end_year, color
```

### Global Secondary Indexes
- **GSI1**: For querying events by era and date
  - GSI1PK: `ERA#<era_id>`, GSI1SK: `DATE#<date>`
- **GSI2**: For querying by type
  - GSI2PK: `TYPE#<event_type>`, GSI2SK: `DATE#<date>`

## Lambda Functions

### Function Structure
```typescript
import { Logger } from '@aws-lambda-powertools/logger'
import { Tracer } from '@aws-lambda-powertools/tracer'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const logger = new Logger({ serviceName: 'ai-timeline' })
const tracer = new Tracer({ serviceName: 'ai-timeline' })

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  logger.info('Processing request', { path: event.requestContext.http.path })

  try {
    // Handler logic
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: result }),
    }
  } catch (error) {
    logger.error('Request failed', { error })
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
```

### Lambda Best Practices
- Keep handlers thin; extract business logic to separate modules
- Use environment variables for configuration
- Implement proper error handling and logging
- Set appropriate memory and timeout limits
- Use Lambda Layers for shared dependencies

## Infrastructure as Code

### AWS CDK (Preferred)
```typescript
// Use CDK constructs for infrastructure
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'

export class AITimelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Define resources with proper naming and tagging
    const table = new dynamodb.Table(this, 'DataTable', {
      tableName: `ai-timeline-${this.stackName}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })
  }
}
```

### Environment Management
- Use CDK context or SSM Parameter Store for environment-specific config
- Separate stacks for stateful (DynamoDB, S3) and stateless (Lambda, API) resources
- Implement proper IAM roles with least-privilege access

## API Design

### REST Endpoints
```
GET    /api/events              # List events (with filters, pagination)
GET    /api/events/:id          # Get single event with related data
GET    /api/concepts            # List concepts
GET    /api/concepts/:id        # Get concept with prereqs and related
GET    /api/people              # List people
GET    /api/people/:id          # Get person profile
GET    /api/orgs                # List organizations
GET    /api/orgs/:id            # Get organization profile
GET    /api/search              # Full-text search across all entities
GET    /api/eras                # Get era definitions for timeline bands
```

### Response Format
```json
{
  "data": { ... },
  "meta": {
    "total": 200,
    "page": 1,
    "pageSize": 50
  }
}
```

## Security

- Enable AWS WAF on CloudFront/API Gateway
- Use Cognito for admin authentication
- Implement rate limiting at API Gateway
- Validate and sanitize all inputs
- Use HTTPS everywhere (CloudFront handles this)
- Enable CloudTrail for audit logging
