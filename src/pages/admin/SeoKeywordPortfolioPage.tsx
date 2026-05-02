import { AlertTriangle, Archive, ArrowUpRight, CircleCheck, Clock3, Compass, Flame, Layers3, Pause, Plus, RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { SeoEditorialSeedDrawer } from '../../components/admin/SeoEditorialSeedDrawer';
import { SeoKeywordOpportunityDrawer } from '../../components/admin/SeoKeywordOpportunityDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoKeywordOpportunityClusterSourceRef,
  type SeoKeywordOpportunityListResult,
  type SeoKeywordOpportunityRecord,
  type SeoKeywordPortfolioRebuildResult,
  type SeoKeywordOpportunitySerperSourceRef,
  type SeoKeywordOpportunitySourceFilter,
  type SeoKeywordOpportunityStatus,
  type SeoKeywordOpportunityStatusFilter,
  type SeoSerperUsageSummary,
} from '../../services/api';

type PortfolioSort = 'laea_fit' | 'overall' | 'demand' | 'competition';
const STALE_ARCHIVED_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  pricingEnabled: false,
  pausedBySeoAgent: false,
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
  remainingCreditsSource: 'unavailable',
  remainingCreditsObservedAt: null,
  projectedDepletionDate: null,
  lastSampledAt: null,
  warningLevel: 'ok',
  policy: null,
};

interface TooltipPosition {
  top: number;
  left: number;
}

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

function isClusterSourceRef(
  sourceRef: SeoKeywordOpportunityRecord['sourceRef'],
): sourceRef is SeoKeywordOpportunityClusterSourceRef {
  return Boolean(sourceRef && 'clusterId' in sourceRef);
}

function isSerperSourceRef(
  sourceRef: SeoKeywordOpportunityRecord['sourceRef'],
): sourceRef is SeoKeywordOpportunitySerperSourceRef {
  return Boolean(sourceRef && 'vendor' in sourceRef && sourceRef.vendor === 'serper');
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

function getStatusBadge(status: SeoKeywordOpportunityStatus) {
  switch (status) {
    case 'promoted':
      return {
        label: 'Promoted',
        icon: Sparkles,
        className: getStatusBadgeClasses(status),
      };
    case 'archived':
      return {
        label: 'Archived',
        icon: Archive,
        className: getStatusBadgeClasses(status),
      };
    case 'discovered':
      return {
        label: 'Discovered',
        icon: Search,
        className: getStatusBadgeClasses(status),
      };
    case 'scored':
    default:
      return {
        label: 'Scored',
        icon: Layers3,
        className: getStatusBadgeClasses(status),
      };
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

function getScoreTierLabel(value: number): 'high' | 'medium' | 'low' {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

function ScoreBar({
  value,
  label,
  inverse = false,
}: {
  value: number;
  label: string;
  inverse?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const ariaLabel = inverse
    ? `${label}: ${clamped} of 100, ${getScoreTierLabel(clamped)} competition`
    : `${label}: ${clamped} of 100, ${getScoreTierLabel(clamped)}`;

  return (
    <div className="min-w-[140px]" role="group" aria-label={ariaLabel}>
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
  const fractionalDigits = value > 0 && value < 0.01 ? 4 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionalDigits,
    maximumFractionDigits: fractionalDigits,
  }).format(value);
}

function formatUsdRate(value: number): string {
  return `${formatUsd(value)} / 1k queries`;
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

  const includeYear = parsed.getFullYear() !== new Date().getFullYear();

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusFilterLabel(status: SeoKeywordOpportunityStatusFilter): string {
  return STATUS_TABS.find((tab) => tab.id === status)?.label ?? 'All';
}

function buildFilteredEmptyStateCopy({
  status,
  sourceType,
}: {
  status: SeoKeywordOpportunityStatusFilter;
  sourceType: SeoKeywordOpportunitySourceFilter;
}): {
  icon: ReactNode;
  title: string;
  description: string;
  cta?: {
    label: string;
    action: 'openEditorialSeed';
  };
} {
  const statusSuffix = status !== 'all'
    ? ` while filtering to ${getStatusFilterLabel(status).toLowerCase()}`
    : '';

  switch (sourceType) {
    case 'editorial_seed':
      return {
        icon: <Compass className="h-6 w-6" />,
        title: 'No editorial seed entries yet',
        description: `There are no manually seeded opportunities${statusSuffix}. Add an editorial seed to keep the discovery backlog moving even when automated sources are quiet.`,
        cta: {
          label: 'Add editorial seed',
          action: 'openEditorialSeed',
        },
      };
    case 'google_trends':
      return {
        icon: <TrendingUp className="h-6 w-6" />,
        title: 'No Google Trends entries yet',
        description: `The Trends source has not produced any qualifying opportunities${statusSuffix}. That usually means the current trend window was too noisy or not AI-relevant enough for LAEA.`,
      };
    case 'serp_sample':
      return {
        icon: <Search className="h-6 w-6" />,
        title: 'No SERP sample entries yet',
        description: `The paid SERP refinement lane has not produced any qualifying opportunities${statusSuffix}. It may be waiting on shortlist quality, cache reuse, or spend guardrails before sampling again.`,
      };
    case 'gsc_cluster':
      return {
        icon: <Layers3 className="h-6 w-6" />,
        title: 'No GSC cluster entries yet',
        description: `Recent Search Console cluster mining did not surface any matching opportunities${statusSuffix}. Try a broader filter or rebuild the portfolio after the next weekly ingest.`,
      };
    case 'all':
    default:
      return {
        icon: <Compass className="h-6 w-6" />,
        title: `No ${getStatusFilterLabel(status).toLowerCase()} opportunities`,
        description: 'Try another source or status filter to widen the backlog view.',
      };
  }
}

function getAriaSort(sort: PortfolioSort, column: PortfolioSort): 'ascending' | 'descending' | 'none' {
  if (sort !== column) {
    return 'none';
  }

  return column === 'competition' ? 'ascending' : 'descending';
}

function SortHeaderButton({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: PortfolioSort;
  sort: PortfolioSort;
  onSort: (nextSort: PortfolioSort) => void;
}) {
  const active = sort === column;
  const ariaSort = getAriaSort(sort, column);

  return (
    <button
      type="button"
      aria-sort={ariaSort}
      onClick={() => onSort(column)}
      className={[
        'inline-flex items-center gap-2 rounded-full px-2 py-1 text-left text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
        active
          ? 'text-orange-600 dark:text-orange-300'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ].join(' ')}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="font-mono text-[10px] leading-none">
        {active ? (ariaSort === 'ascending' ? '▲' : '▼') : '▲▼'}
      </span>
    </button>
  );
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

function getSerperStatusLabel(serper: SeoSerperUsageSummary): string {
  if (serper.pausedBySeoAgent) {
    return 'SEO paused';
  }

  if (serper.configured && !serper.pricingEnabled) {
    return 'Policy disabled';
  }

  switch (serper.warningLevel) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'watch':
      return 'Watch';
    case 'ok':
    default:
      return 'Healthy';
  }
}

function getSerperStatusClasses(serper: SeoSerperUsageSummary): string {
  if (serper.pausedBySeoAgent) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  }

  if (serper.configured && !serper.pricingEnabled) {
    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }

  return getSerperWarningClasses(serper.warningLevel);
}

function getSerperStatusIcon(serper: SeoSerperUsageSummary) {
  if (serper.pausedBySeoAgent) {
    return Pause;
  }

  if (serper.configured && !serper.pricingEnabled) {
    return Archive;
  }

  switch (serper.warningLevel) {
    case 'critical':
      return AlertTriangle;
    case 'warning':
      return Flame;
    case 'watch':
      return Clock3;
    case 'ok':
    default:
      return CircleCheck;
  }
}

function getSerperBalanceLabel(serper: SeoSerperUsageSummary): string {
  if (serper.remainingCreditsSource === 'vendor_observed_adjusted') {
    return 'Tracked Vendor Balance';
  }

  return 'Tracked Credits';
}

function getSerperBalanceDetail(serper: SeoSerperUsageSummary): string {
  if (serper.remainingCreditsSource === 'vendor_observed_adjusted') {
    return serper.remainingCreditsObservedAt
      ? `Observed ${formatDateTime(serper.remainingCreditsObservedAt)} and adjusted by LAEA-tracked queries since then`
      : 'Observed in Serper billing and adjusted by LAEA-tracked queries since then';
  }

  if (serper.remainingCreditsSource === 'policy_derived') {
    return `Policy baseline only · Pack ${formatCount(serper.purchasedCredits)}`;
  }

  return `Tier ${serper.tierLabel ?? 'custom'}`;
}

function getSerperBurnState(serper: SeoSerperUsageSummary): {
  label: string;
  detail: string;
  className: string;
  icon: typeof CircleCheck;
} | null {
  if (!serper.configured) {
    return null;
  }

  if (serper.pausedBySeoAgent) {
    return {
      label: 'SEO paused',
      detail: 'Paid SERP sampling is paused by the global SEO control switch.',
      className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
      icon: Pause,
    };
  }

  if (!serper.pricingEnabled) {
    return {
      label: 'Sampling disabled',
      detail: 'The current pricing policy disables paid SERP sampling until the policy is re-enabled.',
      className: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200',
      icon: Archive,
    };
  }

  if (serper.remainingCreditsSource === 'policy_derived' && serper.purchasedCredits && serper.remainingCredits !== null) {
    const burnedRatio = (serper.purchasedCredits - serper.remainingCredits) / serper.purchasedCredits;
    if (burnedRatio >= 0.9) {
      return {
        label: '90%+ credits used',
        detail: 'Critical burn threshold reached. Replenish credits or pause sampling soon.',
        className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
        icon: AlertTriangle,
      };
    }

    if (burnedRatio >= 0.75) {
      return {
        label: '75%+ credits used',
        detail: 'Late-burn zone. Keep automatic discovery narrow until credits are replenished.',
        className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200',
        icon: Flame,
      };
    }

    if (burnedRatio >= 0.5) {
      return {
        label: '50%+ credits used',
        detail: 'Mid-burn threshold crossed. Keep an eye on weekly rebuild frequency.',
        className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
        icon: Clock3,
      };
    }

    if (burnedRatio >= 0.25) {
      return {
        label: '25%+ credits used',
        detail: 'Early burn threshold crossed. Sampling is still healthy, but usage is no longer near-zero.',
        className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
        icon: TrendingUp,
      };
    }

    return {
      label: 'Under 25% used',
      detail: 'Healthy runway remains on the configured credit-pack baseline.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
      icon: CircleCheck,
    };
  }

  if (serper.remainingCreditsSource === 'vendor_observed_adjusted') {
    return {
      label: 'Vendor balance tracked',
      detail: serper.remainingCreditsObservedAt
        ? `Balance is anchored to a Serper billing observation from ${formatDateTime(serper.remainingCreditsObservedAt)} and decremented by LAEA-tracked queries after that point.`
        : 'Balance is anchored to a Serper billing observation and decremented by LAEA-tracked queries after that point.',
      className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
      icon: TrendingUp,
    };
  }

  if (serper.warningLevel === 'critical') {
    return {
      label: 'Depletion risk <14 days',
      detail: 'Projected depletion is inside the critical window even without a purchased-credit balance estimate.',
      className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
      icon: AlertTriangle,
    };
  }

  if (serper.warningLevel === 'warning') {
    return {
      label: 'Depletion risk <30 days',
      detail: 'Projected depletion is inside the warning window, so keep paid sampling conservative.',
      className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200',
      icon: Flame,
    };
  }

  return {
    label: 'Budget healthy',
    detail: 'No purchased-credit depletion warning is active right now.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
    icon: CircleCheck,
  };
}

function getSerperOpsSummary(serper: SeoSerperUsageSummary): string {
  if (!serper.configured) {
    return 'Serper is not configured yet. Once the API key and pricing JSON are in SSM, this card will show tracked usage and policy details.';
  }

  if (serper.pausedBySeoAgent) {
    return 'The global SEO pause switch is on, so paid discovery sampling is intentionally read-only until auto-ship resumes.';
  }

  if (!serper.pricingEnabled) {
    return 'Pricing policy currently disables Serper, so this discovery lane is intentionally read-only.';
  }

  if (serper.remainingCreditsSource === 'vendor_observed_adjusted') {
    return 'Serper is only used to refine shortlisted opportunities. Query caps and cache reuse keep spend intentional, and the balance card is anchored to the last vendor billing observation rather than guessed from a static pack size.';
  }

  return 'Serper is only used to refine shortlisted opportunities. Cache-first sampling and query caps keep this lane useful without becoming a quiet cost leak, and balance is tracked against the configured policy baseline.';
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

function buildRebuildInlineSummary(rebuild: SeoKeywordPortfolioRebuildResult): string {
  const telemetryBits = [
    `${rebuild.candidateCount} candidates`,
    `${rebuild.totalActive} active`,
    `${rebuild.serperSampling.cacheHits} cache hit${rebuild.serperSampling.cacheHits === 1 ? '' : 's'}`,
    `${rebuild.serperSampling.freshSamples} fresh sample${rebuild.serperSampling.freshSamples === 1 ? '' : 's'}`,
  ];

  if (rebuild.serperSampling.skippedSamples > 0) {
    telemetryBits.push(`${rebuild.serperSampling.skippedSamples} skipped`);
  }

  return telemetryBits.join(' · ');
}

function buildPromotionConfirmMessage(opportunity: SeoKeywordOpportunityRecord): string {
  const targetSummary = opportunity.targetUrl
    ? opportunity.targetUrl.replace('https://letaiexplainai.com', '')
    : 'No target URL yet';

  return `"${opportunity.seedQuery}" is scored ${opportunity.overallScore.toFixed(1)} overall with demand ${Math.round(opportunity.demandProxy)}/100, competition ${Math.round(opportunity.competitionProxy)}/100, and LAEA fit ${Math.round(opportunity.laeaFitScore)}/100. Recommended destination: ${opportunity.pageTypeRecommendation.replace(/_/g, ' ')} · ${targetSummary}. This will queue a proposal for human review and mark the opportunity as promoted. Continue?`;
}

function buildArchiveConfirmMessage(opportunity: SeoKeywordOpportunityRecord): string {
  return `"${opportunity.seedQuery}" will move from the active discovery queue into archived status. Keep this for opportunities you do not want weekly rebuilds or operator reviews to keep surfacing. This does not create a proposal or experiment. Continue?`;
}

function buildSourceTooltipModel(opportunity: SeoKeywordOpportunityRecord): {
  eyebrow: string;
  title: string;
  detail: string;
  href: string | null;
  hrefLabel: string | null;
} {
  if (isClusterSourceRef(opportunity.sourceRef)) {
    const sourceRef = opportunity.sourceRef;
    return {
      eyebrow: 'GSC cluster provenance',
      title: sourceRef.representativeQuery,
      detail: `${sourceRef.windowStart} to ${sourceRef.windowEnd} · ${sourceRef.impressions.toLocaleString()} impressions · ${sourceRef.primaryPage.replace('https://letaiexplainai.com', '')}`,
      href: '/admin/seo-insights/clusters',
      hrefLabel: 'Open clusters tab',
    };
  }

  if (isSerperSourceRef(opportunity.sourceRef)) {
    const sourceRef = opportunity.sourceRef;
    const sampleDate = formatShortDate(sourceRef.sampledAt);
    return {
      eyebrow: 'Serper sample provenance',
      title: sourceRef.query,
      detail: `${sourceRef.country.toUpperCase()}/${sourceRef.language.toUpperCase()} · ${sourceRef.dateRange} · page ${sourceRef.page}${sampleDate ? ` · sampled ${sampleDate}` : ''}`,
      href: opportunity.targetUrl,
      hrefLabel: opportunity.targetUrl ? 'Open target page' : null,
    };
  }

  if (opportunity.sourceType === 'google_trends') {
    return {
      eyebrow: 'Google Trends provenance',
      title: opportunity.seedQuery,
      detail: 'Trending-topic discovery that passed LAEA-fit scoring before any paid SERP refinement.',
      href: opportunity.targetUrl,
      hrefLabel: opportunity.targetUrl ? 'Open target page' : null,
    };
  }

  return {
    eyebrow: 'Editorial seed provenance',
    title: opportunity.seedQuery,
    detail: 'Manual operator seed added directly to the portfolio backlog for scoring and review.',
    href: opportunity.targetUrl,
    hrefLabel: opportunity.targetUrl ? 'Open target page' : null,
  };
}

function SourcePill({
  opportunity,
}: {
  opportunity: SeoKeywordOpportunityRecord;
}) {
  const source = getSourceConfig(opportunity.sourceType);
  const SourceIcon = source.icon;
  const tooltip = buildSourceTooltipModel(opportunity);
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
  }, []);

  const openTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const tooltipWidth = 288;
    const halfWidth = tooltipWidth / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, halfWidth + 16),
      window.innerWidth - halfWidth - 16,
    );

    setPosition({
      top: rect.bottom + 12,
      left,
    });
    setShowTooltip(true);
  }, []);

  const closeTooltip = useCallback(() => {
    hideTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 120);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        aria-describedby={showTooltip ? `seo-source-tooltip-${opportunity.id}` : undefined}
        data-testid={`seo-source-pill-${opportunity.id}`}
        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${source.className}`}
      >
        <SourceIcon className="h-3.5 w-3.5" />
        {source.label}
      </button>

      {showTooltip && position ? createPortal(
        <div
          id={`seo-source-tooltip-${opportunity.id}`}
          role="tooltip"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          className="fixed z-[90] w-72 -translate-x-1/2"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-left text-white shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">{tooltip.eyebrow}</p>
            <p className="mt-2 text-sm font-semibold">{tooltip.title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{tooltip.detail}</p>
            {tooltip.href && tooltip.hrefLabel ? (
              <a
                href={tooltip.href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
              >
                {tooltip.hrefLabel}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function canPromoteOpportunity(opportunity: SeoKeywordOpportunityRecord): boolean {
  return (
    opportunity.status === 'scored'
    && opportunity.pageTypeRecommendation === 'blog_post'
    && (Boolean(opportunity.clusterSnapshotId) || Boolean(opportunity.targetUrl))
  );
}

function hasUnavailableSource(opportunity: SeoKeywordOpportunityRecord): boolean {
  if (opportunity.sourceType === 'gsc_cluster') {
    return !isClusterSourceRef(opportunity.sourceRef);
  }

  if (opportunity.sourceType === 'serp_sample') {
    return !isSerperSourceRef(opportunity.sourceRef);
  }

  return false;
}

function isStaleArchivedOpportunity(opportunity: SeoKeywordOpportunityRecord): boolean {
  if (opportunity.status !== 'archived') {
    return false;
  }

  const updatedAt = new Date(opportunity.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  return Date.now() - updatedAt.getTime() >= STALE_ARCHIVED_DAYS * DAY_MS;
}

function updateKeywordOpportunityResult(
  current: SeoKeywordOpportunityListResult | null,
  nextOpportunity: SeoKeywordOpportunityRecord,
): SeoKeywordOpportunityListResult | null {
  if (!current) {
    return current;
  }

  let previousStatus: SeoKeywordOpportunityStatus | null = null;
  let foundMatch = false;

  const nextData = current.data.map((row) => {
    if (row.id !== nextOpportunity.id) {
      return row;
    }

    foundMatch = true;
    previousStatus = row.status;
    return nextOpportunity;
  });

  if (!foundMatch) {
    return current;
  }

  const nextCounts: Record<SeoKeywordOpportunityStatusFilter, number> = { ...current.meta.counts };
  if (previousStatus && previousStatus !== nextOpportunity.status) {
    const previousKey = previousStatus as keyof typeof nextCounts;
    const nextKey = nextOpportunity.status as keyof typeof nextCounts;
    nextCounts[previousKey] = Math.max(0, nextCounts[previousKey] - 1);
    nextCounts[nextKey] += 1;
  }

  return {
    ...current,
    data: nextData,
    meta: {
      ...current.meta,
      counts: nextCounts,
    },
  };
}

export default function SeoKeywordPortfolioPage() {
  const [status, setStatus] = useState<SeoKeywordOpportunityStatusFilter>('all');
  const [sourceType, setSourceType] = useState<SeoKeywordOpportunitySourceFilter>('all');
  const [sort, setSort] = useState<PortfolioSort>('laea_fit');
  const [result, setResult] = useState<SeoKeywordOpportunityListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rebuildPending, setRebuildPending] = useState(false);
  const [lastRebuild, setLastRebuild] = useState<SeoKeywordPortfolioRebuildResult | null>(null);
  const [promotePendingId, setPromotePendingId] = useState<string | null>(null);
  const [promoteConfirmOpportunity, setPromoteConfirmOpportunity] = useState<SeoKeywordOpportunityRecord | null>(null);
  const [archivePendingId, setArchivePendingId] = useState<string | null>(null);
  const [archiveConfirmOpportunity, setArchiveConfirmOpportunity] = useState<SeoKeywordOpportunityRecord | null>(null);
  const [refreshPendingId, setRefreshPendingId] = useState<string | null>(null);
  const [editorialSeedOpen, setEditorialSeedOpen] = useState(false);
  const [editorialSeedPending, setEditorialSeedPending] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SeoKeywordOpportunityRecord | null>(null);
  const sourceFilterRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const resultRef = useRef<SeoKeywordOpportunityListResult | null>(null);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const loadPortfolio = useCallback(async (options?: { background?: boolean }) => {
    const backgroundRefresh = Boolean(options?.background && resultRef.current);
    if (!backgroundRefresh) {
      setLoading(true);
    }
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
      const message = nextError instanceof Error ? nextError.message : 'Failed to load SEO keyword portfolio';
      if (backgroundRefresh) {
        toast.error(message);
      } else {
        setError(message);
      }
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  }, [sourceType, status]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const opportunities = useMemo(() => {
    const rows = [...(result?.data ?? [])]
      .filter((row) => (status === 'all' ? !isStaleArchivedOpportunity(row) : row.status === status))
      .filter((row) => (sourceType === 'all' ? true : row.sourceType === sourceType));
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
  }, [result?.data, sort, sourceType, status]);

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
  const serperPolicy = serper.policy;
  const serperBurnState = getSerperBurnState(serper);
  const hasActiveFilters = status !== 'all' || sourceType !== 'all';
  const filteredEmptyState = useMemo(
    () => buildFilteredEmptyStateCopy({ status, sourceType }),
    [sourceType, status],
  );
  const setSortFromHeader = useCallback((nextSort: PortfolioSort) => {
    startTransition(() => {
      setSort(nextSort);
    });
  }, []);
  const activateSourceFilter = useCallback((nextSourceType: SeoKeywordOpportunitySourceFilter) => {
    startTransition(() => {
      setSourceType(nextSourceType);
    });
  }, []);
  const handleSourceFilterKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const currentFilter = SOURCE_FILTERS[index];
    if (!currentFilter) {
      return;
    }

    const lastIndex = SOURCE_FILTERS.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activateSourceFilter(currentFilter.id);
        return;
      default:
        return;
    }

    event.preventDefault();
    sourceFilterRefs.current[nextIndex]?.focus();
  }, [activateSourceFilter]);

  async function handleRebuild() {
    setRebuildPending(true);
    try {
      const rebuild = await seoInsightsApi.rebuildKeywordPortfolio();
      setLastRebuild(rebuild);
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
      setResult((current) => updateKeywordOpportunityResult(current, response.opportunity));
      setSelectedOpportunity(response.opportunity);
      toast.success(
        <span>
          Proposal queued for <span className="font-semibold">{response.proposal.targetKeyword}</span>.{' '}
          <a href={response.proposal.handoff?.proposalPath ?? '/admin/seo-insights/proposals'} className="underline">
            Open proposals
          </a>
        </span>,
      );
      void loadPortfolio({ background: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to promote keyword opportunity');
    } finally {
      setPromotePendingId(null);
    }
  }

  function handlePromoteRequest(opportunity: SeoKeywordOpportunityRecord) {
    setPromoteConfirmOpportunity(opportunity);
  }

  async function handleConfirmPromote() {
    if (!promoteConfirmOpportunity) {
      return;
    }

    await handlePromote(promoteConfirmOpportunity);
    setPromoteConfirmOpportunity(null);
  }

  async function handleArchive(opportunity: SeoKeywordOpportunityRecord) {
    setArchivePendingId(opportunity.id);
    try {
      const response = await seoInsightsApi.archiveKeywordOpportunity(opportunity.id);
      setResult((current) => updateKeywordOpportunityResult(current, response.opportunity));
      setSelectedOpportunity(response.opportunity);
      toast.success(`Archived ${response.opportunity.seedQuery}`);
      void loadPortfolio({ background: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to archive keyword opportunity');
    } finally {
      setArchivePendingId(null);
    }
  }

  function handleArchiveRequest(opportunity: SeoKeywordOpportunityRecord) {
    setArchiveConfirmOpportunity(opportunity);
  }

  async function handleConfirmArchive() {
    if (!archiveConfirmOpportunity) {
      return;
    }

    await handleArchive(archiveConfirmOpportunity);
    setArchiveConfirmOpportunity(null);
  }

  async function handleRefreshSerp(opportunity: SeoKeywordOpportunityRecord) {
    setRefreshPendingId(opportunity.id);
    try {
      const response = await seoInsightsApi.refreshKeywordOpportunitySerp(opportunity.id);
      setResult((current) => updateKeywordOpportunityResult(current, response.opportunity));
      setSelectedOpportunity(response.opportunity);
      toast.success(`SERP sample refreshed for ${response.opportunity.seedQuery}`);
      void loadPortfolio({ background: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to refresh SERP sample');
    } finally {
      setRefreshPendingId(null);
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

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

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
              {getSerperOpsSummary(serper)}
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getSerperStatusClasses(serper)}`}>
              {(() => {
                const StatusIcon = getSerperStatusIcon(serper);
                return <StatusIcon className="h-3.5 w-3.5" />;
              })()}
              {getSerperStatusLabel(serper)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {serper.autoTopupEnabled ? 'Auto top-up on' : 'Auto top-up off'}
            </span>
          </div>
        </div>

        {serperBurnState ? (() => {
          const BurnStateIcon = serperBurnState.icon;
          return (
            <div
              data-testid="seo-serper-burn-state"
              className={`mt-4 rounded-2xl border px-4 py-3 ${serperBurnState.className}`}
            >
              <div className="flex items-start gap-3">
                <BurnStateIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{serperBurnState.label}</p>
                  <p className="mt-1 text-sm">{serperBurnState.detail}</p>
                </div>
              </div>
            </div>
          );
        })() : null}

        {!serper.configured ? (
          <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-white/70 px-4 py-4 text-sm text-slate-700 dark:border-amber-900/60 dark:bg-slate-950/50 dark:text-slate-300">
            Serper is not configured yet. Once the API key and pricing JSON are in SSM, this page will start showing tracked credits, modeled spend, and the last sampled SERP timestamp.
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">This Week</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {serper.creditsUsedWeek.toLocaleString()} queries
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatUsd(serper.effectiveSpendWeekUsd)} modeled spend</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Modeled Month</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {formatUsd(serper.effectiveSpendMonthUsd)}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Budget {formatCount(serper.monthlyCreditBudget)} credits
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{getSerperBalanceLabel(serper)}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {formatCount(serper.remainingCredits)}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {getSerperBalanceDetail(serper)}
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
            {serperPolicy ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Request Scope</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    Google {serperPolicy.endpoint} · {serperPolicy.country.toUpperCase()}/{serperPolicy.language.toUpperCase()} · {serperPolicy.dateRange} · page {serperPolicy.page}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Automatic sampling stays on the first results page.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Query Caps</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {serperPolicy.maxQueriesPerRun}/run · {serperPolicy.maxQueriesPerDay}/day · {serperPolicy.maxQueriesPerWeek}/week
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Automatic cache TTL: {serperPolicy.cacheTtlDays} days</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pricing Basis</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatUsdRate(serperPolicy.usdPerThousandQueries)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Monthly guardrail: {formatCount(serper.monthlyCreditBudget)} credits
                  </p>
                </div>
              </div>
            ) : null}
          </>
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

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Source filters">
            {SOURCE_FILTERS.map((filter, index) => (
              <button
                key={filter.id}
                ref={(node) => {
                  sourceFilterRefs.current[index] = node;
                }}
                type="button"
                onClick={() => activateSourceFilter(filter.id)}
                onKeyDown={(event) => handleSourceFilterKeyDown(event, index)}
                aria-pressed={sourceType === filter.id}
                data-testid={`seo-source-filter-${filter.id}`}
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

          {lastRebuild ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Latest rebuild</p>
              <p className="mt-2">{buildRebuildInlineSummary(lastRebuild)}</p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
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
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-slate-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">First discovery run</p>
              <p className="mt-2">
                Discovery runs weekly. The next run is Monday 13:00 UTC. Use <span className="font-semibold">Rebuild portfolio</span> above if you want candidates before the next scheduled pass.
              </p>
            </div>
            <EmptyState
              icon={<Layers3 className="h-6 w-6" />}
              title="No portfolio entries yet"
              description="Discovery hasn't run yet — the next weekly agent run will populate the portfolio. Or add an editorial seed manually."
              cta={{
                label: 'Add editorial seed',
                onClick: () => setEditorialSeedOpen(true),
              }}
            />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={filteredEmptyState.icon}
              title={filteredEmptyState.title}
              description={filteredEmptyState.description}
              cta={filteredEmptyState.cta
                ? {
                  label: filteredEmptyState.cta.label,
                  onClick: () => setEditorialSeedOpen(true),
                }
                : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">
                    <SortHeaderButton
                      label="Demand"
                      column="demand"
                      sort={sort}
                      onSort={setSortFromHeader}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortHeaderButton
                      label="Competition"
                      column="competition"
                      sort={sort}
                      onSort={setSortFromHeader}
                    />
                  </th>
                  <th className="px-4 py-3">Page type</th>
                  <th className="px-4 py-3">
                    <SortHeaderButton
                      label="LAEA fit"
                      column="laea_fit"
                      sort={sort}
                      onSort={setSortFromHeader}
                    />
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {opportunities.map((opportunity) => {
                  const statusBadge = getStatusBadge(opportunity.status);
                  const StatusIcon = statusBadge.icon;
                  const showUnavailableSource = hasUnavailableSource(opportunity);

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
                        {showUnavailableSource ? (
                          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                            Source unavailable
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <SourcePill opportunity={opportunity} />
                      </td>
                      <td className="px-4 py-4"><ScoreBar value={opportunity.demandProxy} label="Demand" /></td>
                      <td className="px-4 py-4"><ScoreBar value={opportunity.competitionProxy} label="Competition" inverse /></td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                        {opportunity.pageTypeRecommendation.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-4">
                        <ScoreBar value={opportunity.laeaFitScore} label="LAEA fit" />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {canPromoteOpportunity(opportunity) && (
                            <button
                              type="button"
                              onClick={() => handlePromoteRequest(opportunity)}
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
        onPromote={async (opportunity) => {
          handlePromoteRequest(opportunity);
        }}
        promotePendingId={promotePendingId}
        onArchive={async (opportunity) => {
          handleArchiveRequest(opportunity);
        }}
        archivePendingId={archivePendingId}
        onRefreshSerp={handleRefreshSerp}
        refreshPendingId={refreshPendingId}
      />

      <ConfirmDialog
        isOpen={promoteConfirmOpportunity !== null}
        title="Queue this proposal?"
        message={promoteConfirmOpportunity ? buildPromotionConfirmMessage(promoteConfirmOpportunity) : ''}
        confirmLabel="Queue proposal"
        cancelLabel="Keep reviewing"
        onConfirm={() => {
          void handleConfirmPromote();
        }}
        onCancel={() => setPromoteConfirmOpportunity(null)}
        isLoading={promotePendingId === promoteConfirmOpportunity?.id}
      />

      <ConfirmDialog
        isOpen={archiveConfirmOpportunity !== null}
        title="Archive this opportunity?"
        message={archiveConfirmOpportunity ? buildArchiveConfirmMessage(archiveConfirmOpportunity) : ''}
        confirmLabel="Archive opportunity"
        cancelLabel="Keep it active"
        destructive
        onConfirm={() => {
          void handleConfirmArchive();
        }}
        onCancel={() => setArchiveConfirmOpportunity(null)}
        isLoading={archivePendingId === archiveConfirmOpportunity?.id}
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
