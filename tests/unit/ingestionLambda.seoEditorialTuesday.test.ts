import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Context } from 'aws-lambda';

const mockRunIngestionJob = jest.fn();
const mockAnalyzeAllPending = jest.fn();
const mockAnalyzeArticle = jest.fn();
const mockScreenOnly = jest.fn();
const mockIngestBibliography = jest.fn();
const mockGenerateMarkdownReport = jest.fn();
const mockRunBackfill = jest.fn();
const mockRunTrackedWeeklyIngest = jest.fn();
const mockRunSeoWeeklyDigest = jest.fn();
const mockRunSeoEditorialTuesday = jest.fn();
const mockRunSingleEditorialOpportunity = jest.fn();
const mockBackfillBlogEntityLinks = jest.fn();

jest.mock('../../server/src/jobs/ingestionJob', () => ({
  runIngestionJob: mockRunIngestionJob,
}));

jest.mock('../../server/src/services/ingestion/articleAnalyzer', () => ({
  analyzeAllPending: mockAnalyzeAllPending,
  analyzeArticle: mockAnalyzeArticle,
  screenOnly: mockScreenOnly,
}));

jest.mock('../../server/src/services/ingestion/bibliographyIngestion', () => ({
  ingestBibliography: mockIngestBibliography,
  generateMarkdownReport: mockGenerateMarkdownReport,
}));

jest.mock('../../server/src/db', () => ({
  prisma: {
    milestone: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../server/src/services/gsc/gscIngest', () => ({
  runBackfill: mockRunBackfill,
}));

jest.mock('../../server/src/services/gsc/trackedIngest', () => ({
  runTrackedWeeklyIngest: mockRunTrackedWeeklyIngest,
}));

jest.mock('../../server/src/services/seo/weeklyDigestRunner', () => ({
  runSeoWeeklyDigest: mockRunSeoWeeklyDigest,
}));

jest.mock('../../server/src/services/seo/editorialAutopilotRunner', () => ({
  runSeoEditorialTuesday: mockRunSeoEditorialTuesday,
  runSingleEditorialOpportunity: mockRunSingleEditorialOpportunity,
}));

jest.mock('../../server/src/services/seo/backfillBlogEntityLinks', () => ({
  backfillBlogEntityLinks: mockBackfillBlogEntityLinks,
}));

import { handler } from '../../server/src/ingestionLambda';

const context = {
  awsRequestId: 'test-request',
} as Context;

describe('ingestionLambda seoEditorialTuesday action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunTrackedWeeklyIngest.mockResolvedValue({
      mode: 'weekly',
      startDate: '2026-05-02',
      endDate: '2026-05-08',
      finalizedThroughDate: '2026-05-08',
      dailyRowsInserted: 1,
      dailyRowsAttempted: 1,
      snapshotsCreated: 1,
      weekStartsRebuilt: ['2026-05-02'],
      clusterWindowsRebuilt: [],
      durationMs: 1,
    });
    mockRunSeoEditorialTuesday.mockResolvedValue({
      status: 'success',
      dryRun: true,
      force: true,
      selectedCount: 0,
      publishedCount: 0,
      draftCount: 0,
      skippedCount: 0,
      emailedCount: 0,
      failedCount: 0,
    });
    mockRunSeoWeeklyDigest.mockResolvedValue({
      status: 'success',
      dryRun: false,
      force: false,
      weekStart: '2026-05-21',
      shippedCount: 0,
      proposalCount: 1,
      humanOnlyCount: 0,
      measuredCount: 0,
    });
    mockRunSingleEditorialOpportunity.mockResolvedValue({
      id: 'cmpxllifa000102juwkb9ane7',
      sourceType: 'keyword',
      action: 'draft_only',
      status: 'draft_created',
      title: "NVIDIA's Agent Push Meets Local Hardware Reality",
      reason: 'Created successfully.',
      postId: 'post-2',
      publicUrl: null,
      adminUrl: 'https://letaiexplainai.com/admin/blog/post-2/edit',
      qualityGate: null,
    });
    mockBackfillBlogEntityLinks.mockResolvedValue({
      publishedAfter: '2026-05-05',
      dryRun: false,
      scannedCount: 5,
      updatedCount: 4,
      skippedCount: 1,
      items: [],
    });
  });

  it('dispatches dry-run payload options to the Tuesday editorial runner', async () => {
    const response = await handler({
      action: 'seoEditorialTuesday',
      dryRun: true,
      force: true,
      maxPosts: 1,
      maxAutoPublish: 0,
      sendTestEmail: true,
    }, context);

    expect(mockRunSeoEditorialTuesday).toHaveBeenCalledWith({
      dryRun: true,
      force: true,
      maxPosts: 1,
      maxAutoPublish: 0,
      sendTestEmail: true,
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'SEO Tuesday editorial run completed successfully',
      summary: expect.objectContaining({
        status: 'success',
        dryRun: true,
      }),
    });
  });

  it('defaults optional payload flags before dispatch', async () => {
    await handler({ action: 'seoEditorialTuesday' }, context);

    expect(mockRunSeoEditorialTuesday).toHaveBeenCalledWith({
      dryRun: false,
      force: false,
      maxPosts: undefined,
      maxAutoPublish: undefined,
      sendTestEmail: false,
    });
  });

  it('throws when scheduled GSC ingest fails so Lambda metrics and retries see it', async () => {
    mockRunTrackedWeeklyIngest.mockRejectedValue(new Error('invalid_grant'));

    await expect(handler({ action: 'gscWeeklyIngest' }, context)).rejects.toThrow('invalid_grant');
  });

  it('runs Tuesday editorial publishing after a successful non-dry weekly digest', async () => {
    const response = await handler({
      action: 'seoWeeklyDigest',
      force: true,
      maxPosts: 2,
      maxAutoPublish: 1,
    }, context);

    expect(mockRunSeoWeeklyDigest).toHaveBeenCalledWith({
      dryRun: false,
      force: true,
    });
    expect(mockRunSeoEditorialTuesday).toHaveBeenCalledWith({
      dryRun: false,
      force: true,
      maxPosts: 2,
      maxAutoPublish: 1,
      sendTestEmail: false,
    });
    expect(JSON.parse(response.body)).toEqual({
      message: 'SEO weekly digest completed successfully',
      summary: expect.objectContaining({ status: 'success' }),
      editorialSummary: expect.objectContaining({ status: 'success' }),
    });
  });

  it('does not run editorial publishing for weekly digest dry-runs by default', async () => {
    await handler({ action: 'seoWeeklyDigest', dryRun: true }, context);

    expect(mockRunSeoWeeklyDigest).toHaveBeenCalledWith({
      dryRun: true,
      force: false,
    });
    expect(mockRunSeoEditorialTuesday).not.toHaveBeenCalled();
  });

  it('allows weekly digest callers to suppress editorial publishing', async () => {
    await handler({ action: 'seoWeeklyDigest', runEditorial: false }, context);

    expect(mockRunSeoEditorialTuesday).not.toHaveBeenCalled();
  });

  it('dispatches a one-off editorial opportunity retest without touching the weekly runner', async () => {
    const response = await handler({
      action: 'seoEditorialTestOpportunity',
      opportunityId: 'cmpxllifa000102juwkb9ane7',
      weekStart: '2026-06-09',
      force: true,
    }, context);

    expect(mockRunSingleEditorialOpportunity).toHaveBeenCalledWith({
      opportunityId: 'cmpxllifa000102juwkb9ane7',
      weekStart: '2026-06-09',
      force: true,
    });
    expect(mockRunSeoEditorialTuesday).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Single SEO editorial opportunity completed successfully',
      result: expect.objectContaining({
        status: 'draft_created',
        postId: 'post-2',
      }),
    });
  });

  it('dispatches the production entity-link backfill runner', async () => {
    const response = await handler({
      action: 'seoBackfillBlogEntityLinks',
      publishedAfter: '2026-05-05',
      dryRun: false,
      limit: 10,
    }, context);

    expect(mockBackfillBlogEntityLinks).toHaveBeenCalledWith({
      publishedAfter: '2026-05-05',
      dryRun: false,
      limit: 10,
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'SEO blog entity-link backfill completed successfully',
      summary: expect.objectContaining({
        updatedCount: 4,
        scannedCount: 5,
      }),
    });
  });
});
