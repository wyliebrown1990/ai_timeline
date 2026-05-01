import { Compass, Layers3, Plus, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { SeoEditorialSeedDrawer } from '../../components/admin/SeoEditorialSeedDrawer';
import { SeoKeywordOpportunityDrawer } from '../../components/admin/SeoKeywordOpportunityDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { EmptyState, ErrorState, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoKeywordOpportunityListResult,
  type SeoKeywordOpportunityRecord,
  type SeoKeywordPortfolioRebuildResult,
  type SeoKeywordOpportunitySourceFilter,
  type SeoKeywordOpportunityStatus,
  type SeoKeywordOpportunityStatusFilter,
  type SeoSerperUsageSummary,
} from '../../services/api';

type PortfolioSort = 'laea_fit' | 'overall' | 'demand' | 'competition';

const STATUS_TABS: Array<{ id: SeoKeywordOpportunityStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'discovered', label: 'Discovered' },
  { id: 'scored', label: 'Scored' },
  { id: 'promoted', label: 'Promoted' },
  { id: 'archived', label: 'Archived' },
];

const SOURCE_FILTERS: Array<{ id: SeoKeywordOpportunitySourceFilter; label: string }> = [
  { id: 'all', label: 'All sources' },
  { id: 'gsc_cluster', label: 'GSC cluster' },
  { id: 'google_trends', label: 'Google Trends' },
  { id: 'serp_sample', label: 'SERP sample' },
  { id: 'editorial_seed', label: 'Editorial seed' },
];

const EMPTY_SERPER_SUMMARY: SeoSerperUsageSummary = {
  configured: false,
  enabled: false,
  autoTopupEnabled: false,
  tierLabel: null,
  purchasedCredits: null,
  monthlyCreditBudget: null,
  creditsUsedToday: 0,
  creditsUsedWeek: 0,
  creditsUsedMonth: 0,
  creditsUsedTotal: 0,
  effectiveSpendTodayUsd: 0,
  effectiveSpendWeekUsd: 0,
  effectiveSpendMonthUsd: 0,
  effectiveSpendTotalUsd: 0,
  remainingCredits: null,
  projectedDepletionDate: null,
  lastSampledAt: null,
  warningLevel: 'ok',
};

function getSourceConfig(sourceType: SeoKeywordOpportunityRecord['sourceType']) {
  switch (sourceType) {
    case 'google_trends':
      return {
        label: 'Google Trends',
        icon: TrendingUp,
        className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
      };
    case 'serp_sample':
      return {
        label: 'SERP sample',
        icon: Search,
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
      };
    case 'editorial_seed':
      return {
        label: 'Editorial seed',
        icon: Compass,
        className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
    case 'gsc_cluster':
    default:
      return {
        label: 'GSC cluster',
        icon: Layers3,
        className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
      };
  }
}

function getStatusBadgeClasses(status: SeoKeywordOpportunityStatus): string {
  switch (status) {
    case 'promoted':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'archived':
      return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    case 'discovered':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'scored':
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  }
}

function getScoreBarClasses(value: number, inverse = false): string {
  const effective = inverse ? 100 - value : value;
  if (effective >= 70) {
    return 'bg-emerald-500';
  }

  if (effective >= 40) {
    return 'bg-amber-500';
  }

  return inverse ? 'bg-rose-500' : 'bg-slate-400';
}

function getScoreTier(value: number, inverse = false): 'H' | 'M' | 'L' {
  const effective = inverse ? 100 - value : value;
  if (effective >= 70) return 'H';
  if (effective >= 40) return 'M';
  return 'L';
}

function ScoreBar({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{clamped}</span>
        <span>{getScoreTier(clamped, inverse)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${getScoreBarClasses(clamped, inverse)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number | null): string {
  if (value === null) {
    return 'Uncapped';
  }

  return value.toLocaleString();
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Not sampled yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not sampled yet';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSerperWarningClasses(level: SeoSerperUsageSummary['warningLevel']): string {
  switch (level) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'warning':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300';
    case 'watch':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'ok':
    default:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  }
}

function buildRebuildToastMessage(rebuild: SeoKeywordPortfolioRebuildResult): string {
  const serperSummaryBits: string[] = [];

  if (rebuild.serperSampling.cacheHits > 0) {
    serperSummaryBits.push(`${rebuild.serperSampling.cacheHits} cache hit${rebuild.serperSampling.cacheHits === 1 ? '' : 's'}`);
  }

  if (rebuild.serperSampling.freshSamples > 0) {
    serperSummaryBits.push(`${rebuild.serperSampling.freshSamples} fresh sample${rebuild.serperSampling.freshSamples === 1 ? '' : 's'}`);
  }

  if (rebuild.serperSampling.skippedSamples > 0) {
    serperSummaryBits.push(`${rebuild.serperSampling.skippedSamples} skipped`);
  }

  const serperSuffix = serperSummaryBits.length > 0
    ? ` · Serper: ${serperSummaryBits.join(', ')}`
    : '';

  return `Portfolio rebuilt: ${rebuild.candidateCount} candidates, ${rebuild.totalActive} active opportunities${serperSuffix}`;
}

function canPromoteOpportunity(opportunity: SeoKeywordOpportunityRecord): boolean {
  return (
    opportunity.status === 'scored'
    && opportunity.pageTypeRecommendation === 'blog_post'
    && (Boolean(opportunity.clusterSnapshotId) || Boolean(opportunity.targetUrl))
  );
}

export default function SeoKeywordPortfolioPage() {
  const [status, setStatus] = useState<SeoKeywordOpportunityStatusFilter>('all');
  const [sourceType, setSourceType] = useState<SeoKeywordOpportunitySourceFilter>('all');
  const [sort, setSort] = useState<PortfolioSort>('laea_fit');
  const [result, setResult] = useState<SeoKeywordOpportunityListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rebuildPending, setRebuildPending] = useState(false);
  const [promotePendingId, setPromotePendingId] = useState<string | null>(null);
  const [editorialSeedOpen, setEditorialSeedOpen] = useState(false);
  const [editorialSeedPending, setEditorialSeedPending] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SeoKeywordOpportunityRecord | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listKeywordPortfolio({
        page: 1,
        limit: 100,
        status,
        sourceType,
      });
      setResult(nextResult);
      setSelectedOpportunity((current) =>
        current ? nextResult.data.find((row) => row.id === current.id) ?? current : current
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO keyword portfolio');
    } finally {
      setLoading(false);
    }
  }, [sourceType, status]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const opportunities = useMemo(() => {
    const rows = [...(result?.data ?? [])];
    rows.sort((left, right) => {
      switch (sort) {
        case 'overall':
          return right.overallScore - left.overallScore;
        case 'demand':
          return right.demandProxy - left.demandProxy;
        case 'competition':
          return left.competitionProxy - right.competitionProxy;
        case 'laea_fit':
        default:
          return right.laeaFitScore - left.laeaFitScore;
      }
    });
    return rows;
  }, [result?.data, sort]);

  const counts = result?.meta.counts ?? {
    all: 0,
    discovered: 0,
    scored: 0,
    promoted: 0,
    archived: 0,
  };
  const sourceCounts = result?.meta.sourceCounts ?? {
    all: 0,
    gsc_cluster: 0,
    google_trends: 0,
    serp_sample: 0,
    editorial_seed: 0,
  };
  const serper = result?.meta.serper ?? EMPTY_SERPER_SUMMARY;
  const hasActiveFilters = status !== 'all' || sourceType !== 'all';

  async function handleRebuild() {
    setRebuildPending(true);
    try {
      const rebuild = await seoInsightsApi.rebuildKeywordPortfolio();
      toast.success(buildRebuildToastMessage(rebuild));
      await loadPortfolio();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to rebuild keyword portfolio');
    } finally {
      setRebuildPending(false);
    }
  }

  async function handlePromote(opportunity: SeoKeywordOpportunityRecord) {
    setPromotePendingId(opportunity.id);
    try {
      const response = await seoInsightsApi.promoteKeywordOpportunity(opportunity.id);
      setSelectedOpportunity(response.opportunity);
      toast.success(`Proposal queued for ${response.proposal.targetKeyword}`);
      await loadPortfolio();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to promote keyword opportunity');
    } finally {
      setPromotePendingId(null);
    }
  }

  async function handleCreateEditorialSeed(input: {
    seedQuery: string;
    pageTypeRecommendation: string;
    targetUrl?: string | null;
    demandProxy: number;
    competitionProxy: number;
    laeaFitScore: number;
    rationale: string;
  }) {
    setEditorialSeedPending(true);
    try {
      await seoInsightsApi.createEditorialSeed(input);
      toast.success(`Added editorial seed for ${input.seedQuery}`);
      setEditorialSeedOpen(false);
      startTransition(() => {
        setStatus('all');
        setSourceType('editorial_seed');
      });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to add editorial seed');
    } finally {
      setEditorialSeedPending(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="seo-keyword-portfolio-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-sky-950 to-emerald-950 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-100">
              <Layers3 className="h-3.5 w-3.5" />
              Keyword Portfolio
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Score the search demand LAEA should earn next.</h1>
            <p className="mt-3 text-sm leading-6 text-sky-100/85">
              This backlog turns cluster evidence into a ranked portfolio of topic bets, so we can grow organic traffic without guessing.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">All opportunities</p>
              <p className="mt-2 text-lg font-semibold">{counts.all}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Scored backlog</p>
              <p className="mt-2 text-lg font-semibold">{counts.scored}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Promoted</p>
              <p className="mt-2 text-lg font-semibold">{counts.promoted}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav />

      <section
        className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-5 shadow-sm dark:border-amber-900/40 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/20"
        data-testid="seo-serper-ops-card"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Search className="h-3.5 w-3.5" />
              Serper Spend Guardrail
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Keep paid SERP discovery intentional.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Serper is only used to refine shortlisted opportunities. Cache-first sampling and query caps keep this lane useful without becoming a quiet cost leak.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getSerperWarningClasses(serper.warningLevel)}`}>
              {serper.warningLevel === 'ok' ? 'Healthy' : serper.warningLevel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {serper.autoTopupEnabled ? 'Auto top-up on' : 'Auto top-up off'}
            </span>
          </div>
        </div>

        {!serper.configured ? (
          <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-white/70 px-4 py-4 text-sm text-slate-700 dark:border-amber-900/60 dark:bg-slate-950/50 dark:text-slate-300">
            Serper is not configured yet. Once the API key and pricing JSON are in SSM, this page will start showing live credits, spend, and the last sampled SERP timestamp.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">This Week</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {serper.creditsUsedWeek.toLocaleString()} queries
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatUsd(serper.effectiveSpendWeekUsd)} spent</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">This Month</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {formatUsd(serper.effectiveSpendMonthUsd)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Budget {formatCount(serper.monthlyCreditBudget)} credits
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Remaining Credits</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {formatCount(serper.remainingCredits)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Tier {serper.tierLabel ?? 'custom'} · Purchased {formatCount(serper.purchasedCredits)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sampling Activity</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatDateTime(serper.lastSampledAt)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {serper.projectedDepletionDate
                  ? `Projected depletion ${formatDateTime(serper.projectedDepletionDate)}`
                  : 'No depletion projected at current burn'}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Discovery backlog</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Default ranking favors LAEA fit first, then demand and score.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setEditorialSeedOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Add editorial seed
              </button>
              <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    startTransition(() => {
                      setSort(event.target.value as PortfolioSort);
                    });
                  }}
                  className="bg-transparent text-sm font-medium outline-none"
                >
                  <option value="laea_fit">LAEA fit</option>
                  <option value="overall">Overall score</option>
                  <option value="demand">Demand</option>
                  <option value="competition">Competition</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleRebuild()}
                disabled={rebuildPending}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" />
                {rebuildPending ? 'Rebuilding…' : 'Rebuild portfolio'}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <Tabs
              tabs={STATUS_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: counts[tab.id],
              }))}
              activeId={status}
              onChange={(nextStatus) => {
                startTransition(() => {
                  setStatus(nextStatus as SeoKeywordOpportunityStatusFilter);
                });
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setSourceType(filter.id);
                  });
                }}
                className={[
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  sourceType === filter.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900',
                ].join(' ')}
              >
                {filter.label} ({sourceCounts[filter.id]})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState
              title="Couldn't load keyword opportunities"
              message={error}
              onRetry={() => void loadPortfolio()}
            />
          </div>
        ) : opportunities.length === 0 && !hasActiveFilters ? (
          <div className="p-5">
            <EmptyState
              icon={<Layers3 className="h-6 w-6" />}
              title="No keyword opportunities yet"
              description="Rebuild the portfolio after cluster mining to seed the discovery backlog."
            />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Compass className="h-6 w-6" />}
              title="No opportunities in this filter"
              description="Try another source or status filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Demand</th>
                  <th className="px-4 py-3">Competition</th>
                  <th className="px-4 py-3">Page type</th>
                  <th className="px-4 py-3">LAEA fit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {opportunities.map((opportunity) => {
                  const source = getSourceConfig(opportunity.sourceType);
                  const SourceIcon = source.icon;
                  return (
                    <tr
                      key={opportunity.id}
                      className={[
                        'align-top hover:bg-slate-50/70 dark:hover:bg-slate-950/60',
                        opportunity.status === 'promoted' ? 'opacity-80' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{opportunity.seedQuery}</p>
                        <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
                          {opportunity.targetUrl ? opportunity.targetUrl.replace('https://letaiexplainai.com', '') : 'No target URL yet'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${source.className}`}>
                          <SourceIcon className="h-3.5 w-3.5" />
                          {source.label}
                        </span>
                      </td>
                      <td className="px-4 py-4"><ScoreBar value={opportunity.demandProxy} /></td>
                      <td className="px-4 py-4"><ScoreBar value={opportunity.competitionProxy} inverse /></td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                        {opportunity.pageTypeRecommendation.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-4">
                        <ScoreBar value={opportunity.laeaFitScore} />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(opportunity.status)}`}>
                          {opportunity.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {canPromoteOpportunity(opportunity) && (
                            <button
                              type="button"
                              onClick={() => void handlePromote(opportunity)}
                              disabled={promotePendingId === opportunity.id}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                              {promotePendingId === opportunity.id ? 'Queueing…' : 'Queue proposal'}
                            </button>
                          )}
                          {opportunity.status === 'promoted' && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Promoted
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOpportunity(opportunity)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            View detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SeoKeywordOpportunityDrawer
        opportunity={selectedOpportunity}
        open={selectedOpportunity !== null}
        onClose={() => setSelectedOpportunity(null)}
        onPromote={handlePromote}
        promotePendingId={promotePendingId}
      />

      <SeoEditorialSeedDrawer
        open={editorialSeedOpen}
        onClose={() => setEditorialSeedOpen(false)}
        onSubmit={handleCreateEditorialSeed}
        isSubmitting={editorialSeedPending}
      />
    </div>
  );
}
