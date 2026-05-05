import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SerperUsageSummary } from '../../../server/src/services/seo/serperClient';

const mockGetGscHealth = jest.fn();
const mockGetSerperUsageSummary = jest.fn();
const mockIsEditorialPaused = jest.fn();
const mockGetLatestEditorialRunStatus = jest.fn();
const mockSetLatestEditorialRunStatus = jest.fn();
const mockLoadEditorialOpportunityBacklog = jest.fn();
const mockSelectEditorialOpportunities = jest.fn();
const mockSendEditorialRecapEmail = jest.fn();
const mockProcessEditorialOpportunity = jest.fn();

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

jest.mock('../../../server/src/services/seo/editorialEmail', () => ({
  sendEditorialRecapEmail: mockSendEditorialRecapEmail,
}));

jest.mock('../../../server/src/services/seo/editorialBlogDraft', () => ({
  processEditorialOpportunity: mockProcessEditorialOpportunity,
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
  mockSendEditorialRecapEmail.mockResolvedValue({
    sent: true,
    recipient: 'wyliedeveloper@gmail.com',
    sender: 'wyliebrown1990@gmail.com',
    errorMessage: null,
  });
  mockProcessEditorialOpportunity.mockResolvedValue({
    id: 'proposal-1',
    sourceType: 'proposal',
    action: 'auto_publish',
    status: 'auto_published',
    title: 'AI timeline explained',
    reason: 'Created successfully.',
    postId: 'post-1',
    publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
    adminUrl: 'https://letaiexplainai.com/admin/blog/post-1/edit',
    qualityGate: null,
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
    expect(mockSendEditorialRecapEmail).not.toHaveBeenCalled();
    expect(mockProcessEditorialOpportunity).not.toHaveBeenCalled();
  });

  it('creates selected posts during active non-dry runs', async () => {
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
      force: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(mockProcessEditorialOpportunity).toHaveBeenCalledTimes(1);
    expect(mockProcessEditorialOpportunity).toHaveBeenCalledWith(expect.objectContaining({
      id: 'proposal-1',
    }), {
      weekStart: '2026-04-24',
      force: true,
    });
    expect(summary).toEqual(expect.objectContaining({
      selectedCount: 1,
      publishedCount: 1,
      draftCount: 0,
      failedCount: 0,
    }));
    expect(mockSetLatestEditorialRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      publishedCount: 1,
      draftCount: 0,
      items: expect.arrayContaining([
        expect.objectContaining({
          id: 'proposal-1',
          action: 'auto_published',
          publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
          adminUrl: 'https://letaiexplainai.com/admin/blog/post-1/edit',
        }),
      ]),
    }));
  });

  it('preserves successful candidate results when another selected candidate fails', async () => {
    mockSelectEditorialOpportunities.mockReturnValue({
      selected: [
        {
          id: 'proposal-1',
          sourceType: 'proposal',
          action: 'auto_publish',
          title: 'AI timeline explained',
          targetKeyword: 'ai timeline',
          rationale: 'Strong fit.',
          confidence: 0.9,
          source: {},
        },
        {
          id: 'proposal-2',
          sourceType: 'proposal',
          action: 'draft_only',
          title: 'AI glossary map',
          targetKeyword: 'ai glossary',
          rationale: 'Worth drafting.',
          confidence: 0.82,
          source: {},
        },
      ],
      deferred: [],
    });
    mockProcessEditorialOpportunity
      .mockResolvedValueOnce({
        id: 'proposal-1',
        sourceType: 'proposal',
        action: 'auto_publish',
        status: 'auto_published',
        title: 'AI timeline explained',
        reason: 'Created successfully.',
        postId: 'post-1',
        publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
        adminUrl: 'https://letaiexplainai.com/admin/blog/post-1/edit',
        qualityGate: null,
      })
      .mockResolvedValueOnce({
        id: 'proposal-2',
        sourceType: 'proposal',
        action: 'draft_only',
        status: 'failed',
        title: 'AI glossary map',
        reason: 'ANTHROPIC_API_KEY environment variable is not set',
        postId: null,
        publicUrl: null,
        adminUrl: null,
        qualityGate: null,
      });

    const summary = await runSeoEditorialTuesday({
      force: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(mockProcessEditorialOpportunity.mock.calls.map((call) => call[0].id)).toEqual([
      'proposal-1',
      'proposal-2',
    ]);
    expect(summary.status).toBe('warning');
    expect(summary.publishedCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(mockSetLatestEditorialRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'warning',
      publishedCount: 1,
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'proposal-1', action: 'auto_published' }),
        expect.objectContaining({ id: 'proposal-2', action: 'draft_for_review', reason: 'ANTHROPIC_API_KEY environment variable is not set' }),
      ]),
    }));
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
      emailStatus: 'sent',
    }));
  });

  it('dry-run sends recap only when sendTestEmail is explicit', async () => {
    const summary = await runSeoEditorialTuesday({
      dryRun: true,
      sendTestEmail: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(summary.emailedCount).toBe(1);
    expect(mockSendEditorialRecapEmail).toHaveBeenCalledTimes(1);
    expect(mockSetLatestEditorialRunStatus).not.toHaveBeenCalled();
  });

  it('preserves run results and marks warning when recap email fails', async () => {
    mockSendEditorialRecapEmail.mockResolvedValue({
      sent: false,
      recipient: 'wyliedeveloper@gmail.com',
      sender: null,
      errorMessage: 'Missing SSM sender parameter',
    });

    const summary = await runSeoEditorialTuesday({
      force: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(summary.status).toBe('warning');
    expect(summary.errorMessage).toBe('Missing SSM sender parameter');
    expect(mockSetLatestEditorialRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'warning',
      emailStatus: 'failed',
    }));
  });

  it('compacts persisted skipped decisions so SSM standard parameters stay below the size limit', async () => {
    const longTitle = 'Long skipped title '.repeat(40);
    const longReason = 'Long skipped reason '.repeat(40);
    mockSelectEditorialOpportunities.mockReturnValue({
      selected: [],
      deferred: Array.from({ length: 12 }, (_value, index) => ({
        id: `deferred-${index}`,
        sourceType: 'proposal',
        title: longTitle,
        reason: longReason,
      })),
    });

    await runSeoEditorialTuesday({
      force: true,
      now: new Date('2026-05-05T15:00:00.000Z'),
    });

    expect(mockSetLatestEditorialRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      skippedCount: 12,
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'deferred-0' }),
        expect.objectContaining({ id: 'deferred-4' }),
      ]),
    }));
    const persisted = mockSetLatestEditorialRunStatus.mock.calls[0][0] as {
      items: Array<{ title: string; reason: string }>;
    };
    expect(persisted.items).toHaveLength(5);
    expect(persisted.items.every((item) => item.title.length <= 140)).toBe(true);
    expect(persisted.items.every((item) => item.reason.length <= 220)).toBe(true);
    expect(JSON.stringify(persisted).length).toBeLessThan(4096);
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
