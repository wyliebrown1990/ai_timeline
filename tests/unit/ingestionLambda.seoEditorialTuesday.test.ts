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
});
