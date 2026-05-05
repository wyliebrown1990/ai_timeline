import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SerperUsageSummary } from '../../../server/src/services/seo/serperClient';

const mockGetGscHealth = jest.fn();
const mockGetSerperUsageSummary = jest.fn();
const mockIsEditorialPaused = jest.fn();
const mockGetLatestEditorialRunStatus = jest.fn();
const mockSetLatestEditorialRunStatus = jest.fn();
const mockLoadEditorialOpportunityBacklog = jest.fn();
const mockSelectEditorialOpportunities = jest.fn();

jest.mock('../../../server/src/services/gsc/gscIngest', () => ({
  getGscHealth: mockGetGscHealth,
}));

jest.mock('../../../server/src/services/seo/serperClient', () => ({
  getSerperUsageSummary: mockGetSerperUsageSummary,
}));

jest.mock('../../../server/src/services/seo/editorialRunStatus', () => ({
  isEditorialPaused: mockIsEditorialPaused,
  getLatestEditorialRunStatus: mockGetLatestEditorialRunStatus,
  setLatestEditorialRunStatus: mockSetLatestEditorialRunStatus,
}));

jest.mock('../../../server/src/services/seo/editorialOpportunitySelector', () => ({
  loadEditorialOpportunityBacklog: mockLoadEditorialOpportunityBacklog,
  selectEditorialOpportunities: mockSelectEditorialOpportunities,
}));

import { runSeoEditorialTuesday } from '../../../server/src/services/seo/editorialAutopilotRunner';

const SERPER_SUMMARY: SerperUsageSummary = {
  configured: true,
  enabled: true,
  pricingEnabled: true,
  pausedBySeoAgent: false,
  tierLabel: 'starter',
  purchasedCredits: 50_000,
  monthlyCreditBudget: 2_500,
  creditsUsedWeek: 4,
  creditsUsedMonth: 40,
  effectiveSpendWeekUsd: 0.004,
  effectiveSpendMonthUsd: 0.04,
  remainingCredits: 49_960,
  remainingCreditsSource: 'policy_derived',
  remainingCreditsObservedAt: '2026-05-05T12:00:00.000Z',
  projectedDepletionDate: null,
  lastSampledAt: '2026-05-05T12:00:00.000Z',
  autoTopupEnabled: false,
  warningLevel: 'ok',
  policy: {
    endpoint: 'search',
    usdPerThousandQueries: 1,
    maxQueriesPerRun: 3,
    maxQueriesPerDay: 10,
    maxQueriesPerWeek: 25,
    cacheTtlDays: 28,
    country: 'us',
    language: 'en',
    dateRange: 'qdr:m',
    page: 1,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGscHealth.mockResolvedValue({
    paused: false,
    lastWeekCovered: '2026-04-24',
  });
  mockGetSerperUsageSummary.mockResolvedValue(SERPER_SUMMARY);
  mockIsEditorialPaused.mockResolvedValue(false);
  mockGetLatestEditorialRunStatus.mockResolvedValue(null);
  mockSetLatestEditorialRunStatus.mockResolvedValue({});
  mockLoadEditorialOpportunityBacklog.mockResolvedValue({
    proposals: [],
    keywords: [],
  });
  mockSelectEditorialOpportunities.mockReturnValue({
    selected: [],
    deferred: [],
  });
});

describe('editorialAutopilotRunner', () => {
  it('dry-runs without persisting status mutations', async () => {
    mockSelectEditorialOpportunities.mockReturnValue({
      selected: [{
        id: 'proposal-1',
        sourceType: 'proposal',
        action: 'auto_publish',
        title: 'AI timeline explained',
        targetKeyword: 'ai timeline',
        rationale: 'Strong fit.',
        confidence: 0.9,
        source: {},
      }],
      deferred: [],
    });

    const summary = await runSeoEditorialTuesday({
      dryRun: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(summary).toEqual(expect.objectContaining({
      status: 'success',
      dryRun: true,
      weekStart: '2026-04-24',
      selectedCount: 1,
      publishedCount: 0,
      draftCount: 0,
    }));
    expect(mockSetLatestEditorialRunStatus).not.toHaveBeenCalled();
  });

  it('passes zero maxPosts to the selector while paused and persists paused status', async () => {
    mockIsEditorialPaused.mockResolvedValue(true);

    const summary = await runSeoEditorialTuesday({
      force: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(summary.paused).toBe(true);
    expect(mockSelectEditorialOpportunities).toHaveBeenCalledWith(expect.objectContaining({
      maxPosts: 0,
    }));
    expect(mockSetLatestEditorialRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      skippedCount: 1,
    }));
  });

  it('skips when the week has already completed unless forced', async () => {
    mockGetLatestEditorialRunStatus.mockResolvedValue({
      status: 'success',
      startedAt: '2026-05-05T15:00:00.000Z',
      completedAt: '2026-05-05T15:01:00.000Z',
      weekStart: '2026-04-24T00:00:00.000Z',
      publishedCount: 0,
      draftCount: 0,
      skippedCount: 0,
      emailStatus: 'not_attempted',
      digestUrl: null,
      errorMessage: null,
      items: [],
    });

    const summary = await runSeoEditorialTuesday({
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(summary.status).toBe('skipped');
    expect(summary.alreadyCompleted).toBe(true);
    expect(mockLoadEditorialOpportunityBacklog).not.toHaveBeenCalled();
    expect(mockSetLatestEditorialRunStatus).not.toHaveBeenCalled();
  });
});
