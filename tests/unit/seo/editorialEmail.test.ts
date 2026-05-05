import { describe, expect, it } from '@jest/globals';
import type { SeoEditorialTuesdayRunSummary } from '../../../server/src/services/seo/editorialAutopilotRunner';
import { buildEditorialRecapEmail } from '../../../server/src/services/seo/editorialEmail';

function summary(overrides: Partial<SeoEditorialTuesdayRunSummary> = {}): SeoEditorialTuesdayRunSummary {
  return {
    status: 'success',
    startedAt: '2026-05-05T15:00:00.000Z',
    completedAt: '2026-05-05T15:01:00.000Z',
    weekStart: '2026-04-24',
    dryRun: false,
    paused: false,
    alreadyCompleted: false,
    selectedCount: 1,
    publishedCount: 0,
    draftCount: 0,
    skippedCount: 1,
    emailedCount: 0,
    failedCount: 0,
    digestUrl: 'https://letaiexplainai.com/admin/seo-insights',
    errorMessage: null,
    serper: {
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
    },
    decisions: [
      {
        id: 'proposal-1',
        sourceType: 'proposal',
        action: 'auto_publish',
        status: 'planned',
        title: 'AI timeline explained',
        reason: 'Selected for Tuesday editorial automation.',
        publicUrl: 'https://letaiexplainai.com/blog/ai-timeline',
        adminUrl: 'https://letaiexplainai.com/admin/blog/post-1/edit',
        sourceUrl: 'https://letaiexplainai.com/admin/seo-insights/proposals',
      },
      {
        id: 'keyword-1',
        sourceType: 'keyword',
        action: 'skipped',
        status: 'skipped',
        title: 'AI jobs',
        reason: 'Editorial seed rows stay in backlog for human review.',
        sourceUrl: 'https://letaiexplainai.com/admin/seo-insights/portfolio',
      },
    ],
    ...overrides,
  };
}

describe('editorialEmail', () => {
  it('builds a mobile-scannable text and html recap', () => {
    const email = buildEditorialRecapEmail(summary());

    expect(email.subject).toContain('[LAEA SEO] Tuesday editorial success');
    expect(email.text).toContain('Published 0 | Drafts ready 0 | Skipped 1 | Warnings 0');
    expect(email.text).toContain('SEO dashboard: https://letaiexplainai.com/admin/seo-insights');
    expect(email.text).toContain('AI timeline explained');
    expect(email.text).toContain('public=https://letaiexplainai.com/blog/ai-timeline');
    expect(email.text).toContain('edit=https://letaiexplainai.com/admin/blog/post-1/edit');
    expect(email.text).toContain('source=https://letaiexplainai.com/admin/seo-insights/proposals');
    expect(email.text).toContain('source=https://letaiexplainai.com/admin/seo-insights/portfolio');
    expect(email.text).toContain('Editorial seed rows stay in backlog for human review.');
    expect(email.text).toContain('Credits used this week: 4');
    expect(email.html).toContain('Open SEO dashboard');
  });

  it('elevates Serper warnings in recap copy', () => {
    const email = buildEditorialRecapEmail(summary({
      serper: {
        ...summary().serper!,
        warningLevel: 'critical',
      },
    }));

    expect(email.text).toContain('Warnings 1');
    expect(email.text).toContain('Serper warning level: critical');
  });
});
