import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Context } from 'aws-lambda';

const mockRunIngestionJob = jest.fn();
const mockAnalyzeAllPending = jest.fn();
const mockAnalyzeArticle = jest.fn();
const mockScreenOnly = jest.fn();
const mockIngestBibliography = jest.fn();
const mockGenerateMarkdownReport = jest.fn();
const mockRunBackfill = jest.fn();
const mockRunWeeklyIngest = jest.fn();
const mockRunSeoWeeklyDigest = jest.fn();
const mockRunSeoEditorialTuesday = jest.fn();

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
  runWeeklyIngest: mockRunWeeklyIngest,
}));

jest.mock('../../server/src/services/seo/weeklyDigestRunner', () => ({
  runSeoWeeklyDigest: mockRunSeoWeeklyDigest,
}));

jest.mock('../../server/src/services/seo/editorialAutopilotRunner', () => ({
  runSeoEditorialTuesday: mockRunSeoEditorialTuesday,
}));

import { handler } from '../../server/src/ingestionLambda';

const context = {
  awsRequestId: 'test-request',
} as Context;

describe('ingestionLambda seoEditorialTuesday action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunWeeklyIngest.mockResolvedValue({
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
    mockRunWeeklyIngest.mockRejectedValue(new Error('invalid_grant'));

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
});
