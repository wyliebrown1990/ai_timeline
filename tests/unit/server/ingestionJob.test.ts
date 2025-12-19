/**
 * Tests for the Ingestion Job (Sprint 32.1)
 *
 * Tests the scheduled ingestion pipeline that:
 * 1. Fetches articles from all active sources
 * 2. Runs AI analysis on pending articles
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the dependencies before importing the module
const mockGetAll = jest.fn();
const mockCreateArticlesBulk = jest.fn();
const mockUpdateLastChecked = jest.fn();
const mockFetchFromRSS = jest.fn();
const mockAnalyzeAllPending = jest.fn();
const mockPrismaCount = jest.fn();

jest.mock('../../../server/src/services/sources', () => ({
  getAll: mockGetAll,
  createArticlesBulk: mockCreateArticlesBulk,
  updateLastChecked: mockUpdateLastChecked,
}));

jest.mock('../../../server/src/services/ingestion/rssFetcher', () => ({
  fetchFromRSS: mockFetchFromRSS,
}));

jest.mock('../../../server/src/services/ingestion/articleAnalyzer', () => ({
  analyzeAllPending: mockAnalyzeAllPending,
}));

jest.mock('../../../server/src/db', () => ({
  prisma: {
    ingestedArticle: {
      count: mockPrismaCount,
    },
  },
}));

// Import after mocking
import { runIngestionJob, IngestionJobResult } from '../../../server/src/jobs/ingestionJob';

describe('Ingestion Job (Sprint 32.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock return values
    mockPrismaCount.mockResolvedValue(0);
    mockAnalyzeAllPending.mockResolvedValue({ analyzed: 0, errors: 0, results: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runIngestionJob', () => {
    it('should return correct result structure', async () => {
      mockGetAll.mockResolvedValue([]);

      const result = await runIngestionJob();

      expect(result).toMatchObject({
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        durationMs: expect.any(Number),
        sourcesProcessed: 0,
        totalFetched: 0,
        totalCreated: 0,
        totalSkipped: 0,
        sourceResults: [],
        analysisResults: { analyzed: 0, errors: 0 },
        errors: [],
      });
    });

    it('should fetch articles from all active sources', async () => {
      const mockSources = [
        { id: 'source-1', name: 'Test Source 1', feedUrl: 'https://example.com/feed1', isActive: true },
        { id: 'source-2', name: 'Test Source 2', feedUrl: 'https://example.com/feed2', isActive: true },
        { id: 'source-3', name: 'Inactive Source', feedUrl: 'https://example.com/feed3', isActive: false },
      ];

      mockGetAll.mockResolvedValue(mockSources);
      mockFetchFromRSS.mockResolvedValue([
        { externalUrl: 'https://article1.com', title: 'Article 1', content: 'Content 1', publishedAt: new Date() },
      ]);
      mockCreateArticlesBulk.mockResolvedValue({ created: 1, skipped: 0 });

      const result = await runIngestionJob();

      // Should only process active sources (2 out of 3)
      expect(result.sourcesProcessed).toBe(2);
      expect(mockFetchFromRSS).toHaveBeenCalledTimes(2);
      expect(mockFetchFromRSS).toHaveBeenCalledWith('https://example.com/feed1');
      expect(mockFetchFromRSS).toHaveBeenCalledWith('https://example.com/feed2');
    });

    it('should handle source fetch errors gracefully', async () => {
      const mockSources = [
        { id: 'source-1', name: 'Good Source', feedUrl: 'https://good.com/feed', isActive: true },
        { id: 'source-2', name: 'Bad Source', feedUrl: 'https://bad.com/feed', isActive: true },
      ];

      mockGetAll.mockResolvedValue(mockSources);
      mockFetchFromRSS
        .mockResolvedValueOnce([{ externalUrl: 'https://article.com', title: 'Article', content: 'Content', publishedAt: new Date() }])
        .mockRejectedValueOnce(new Error('Network error'));
      mockCreateArticlesBulk.mockResolvedValue({ created: 1, skipped: 0 });

      const result = await runIngestionJob();

      expect(result.sourcesProcessed).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Bad Source');
      expect(result.errors[0]).toContain('Network error');
      // Good source should still be processed
      expect(result.sourceResults[0].created).toBe(1);
      expect(result.sourceResults[1].error).toBe('Network error');
    });

    it('should update lastCheckedAt after fetching', async () => {
      const mockSource = { id: 'source-1', name: 'Test Source', feedUrl: 'https://example.com/feed', isActive: true };

      mockGetAll.mockResolvedValue([mockSource]);
      mockFetchFromRSS.mockResolvedValue([]);
      mockCreateArticlesBulk.mockResolvedValue({ created: 0, skipped: 0 });

      await runIngestionJob();

      expect(mockUpdateLastChecked).toHaveBeenCalledWith('source-1');
    });

    it('should run analysis on pending articles', async () => {
      mockGetAll.mockResolvedValue([]);
      mockPrismaCount.mockResolvedValue(5);
      mockAnalyzeAllPending.mockResolvedValue({ analyzed: 3, errors: 0, results: [] });

      const result = await runIngestionJob();

      expect(mockAnalyzeAllPending).toHaveBeenCalledWith(20); // MAX_ARTICLES_TO_ANALYZE
      expect(result.analysisResults.analyzed).toBe(3);
    });

    it('should skip analysis when no pending articles', async () => {
      mockGetAll.mockResolvedValue([]);
      mockPrismaCount.mockResolvedValue(0);

      const result = await runIngestionJob();

      expect(mockAnalyzeAllPending).not.toHaveBeenCalled();
      expect(result.analysisResults.analyzed).toBe(0);
    });

    it('should calculate correct totals', async () => {
      const mockSources = [
        { id: 'source-1', name: 'Source 1', feedUrl: 'https://s1.com/feed', isActive: true },
        { id: 'source-2', name: 'Source 2', feedUrl: 'https://s2.com/feed', isActive: true },
      ];

      mockGetAll.mockResolvedValue(mockSources);
      mockFetchFromRSS.mockResolvedValue([
        { externalUrl: 'https://a1.com', title: 'A1', content: 'C1', publishedAt: new Date() },
        { externalUrl: 'https://a2.com', title: 'A2', content: 'C2', publishedAt: new Date() },
      ]);
      mockCreateArticlesBulk
        .mockResolvedValueOnce({ created: 2, skipped: 0 })
        .mockResolvedValueOnce({ created: 1, skipped: 1 });

      const result = await runIngestionJob();

      expect(result.totalCreated).toBe(3);
      expect(result.totalSkipped).toBe(1);
      expect(result.totalFetched).toBe(4);
    });

    it('should measure duration correctly', async () => {
      mockGetAll.mockResolvedValue([]);

      const result = await runIngestionJob();

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });
  });
});
