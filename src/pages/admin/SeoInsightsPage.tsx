import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  seoInsightsApi,
  type SeoAgentActionRecord,
  type SeoAgentRunRecord,
  type SeoAgentRunSerperSnapshot,
  type SeoEditorialRunItem,
  type SeoEditorialRunRecord,
  type SeoEditorialStatusResponse,
  type SeoGscRunRecord,
  type SeoInsightsHealth,
  type SeoInsight,
  type SeoInsightBucket,
  type SeoInsightListResult,
  type SeoSerperUsageSummary,
} from '../../services/api';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { ConfirmDialog, Drawer, EmptyState, ErrorState, HelpTooltip, LoadingSkeleton, Tabs } from '../../components/ui';
import { SeoInsightDrawer } from '../../components/admin/SeoInsightDrawer';

const BUCKET_TABS: Array<{ id: SeoInsightBucket; label: string; description: string }> = [
  {
    id: 'winnable_loss',
    label: 'Winnable Losses',
    description: 'Queries ranking well enough to win more clicks with better metadata.',
  },
  {
    id: 'content_gap',
    label: 'Content Gaps',
    description: 'Queries landing on generic pages instead of a strong canonical destination.',
  },
  {
    id: 'trend_signal',
    label: 'Trend Signals',
    description: 'Queries accelerating faster than their trailing baseline.',
  },
  {
    id: 'decay',
    label: 'Decay',
    description: 'Queries that used to rank strongly and are now slipping.',
  },
];

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function getPagePath(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname || pageUrl;
  } catch {
    return pageUrl;
  }
}

function getEmptyStateDescription(bucket: SeoInsightBucket): string {
  if (bucket === 'winnable_loss') {
    return 'Auto-ship rewrites only apply to published blog posts with visible query traffic. This week does not have any qualifying blog-page opportunities yet.';
  }

  return 'That can be healthy. Try another week or another bucket to inspect a different slice of search performance.';
}

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return 'unknown';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

function getSerperWarningClasses(level: SeoSerperUsageSummary['warningLevel']): string {
  switch (level) {
    case 'critical':
      return 'border border-rose-300 bg-rose-100 text-rose-700';
    case 'warning':
      return 'border border-orange-300 bg-orange-100 text-orange-700';
    case 'watch':
      return 'border border-amber-300 bg-amber-100 text-amber-700';
    case 'ok':
    default:
      return 'border border-emerald-200 bg-emerald-100 text-emerald-700';
  }
}

function getSerperWarningLabel(level: SeoSerperUsageSummary['warningLevel']): string {
  switch (level) {
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

function getSerperBalanceLabel(
  source: SeoSerperUsageSummary['remainingCreditsSource'] | SeoAgentRunSerperSnapshot['remainingCreditsSource']
): string {
  return source === 'vendor_observed_adjusted' ? 'Tracked vendor balance' : 'Tracked credits';
}

function getSerperBalanceDetail(
  source: SeoSerperUsageSummary['remainingCreditsSource'] | SeoAgentRunSerperSnapshot['remainingCreditsSource'],
  observedAt: string | null,
  fallback: string
): string {
  if (source !== 'vendor_observed_adjusted') {
    return fallback;
  }

  return observedAt ? `Observed ${formatDateTime(observedAt)}` : 'Observed in vendor billing';
}

function getDigestSerperSnapshotText(snapshot: SeoAgentRunSerperSnapshot): string {
  const balanceLabel = getSerperBalanceLabel(snapshot.remainingCreditsSource).toLowerCase();
  const balanceDetail = getSerperBalanceDetail(
    snapshot.remainingCreditsSource,
    snapshot.remainingCreditsObservedAt,
    'Policy basis'
  );

  return [
    `Serper snapshot for that digest: ${snapshot.creditsUsedWeek.toLocaleString()} queries that week`,
    `${formatUsd(snapshot.effectiveSpendMonthUsd)} modeled month`,
    `${balanceLabel} ${formatCount(snapshot.remainingCredits)}`,
    balanceDetail,
  ].join(' · ');
}

function getDigestStatusPill(run: SeoAgentRunRecord): { label: string; classes: string } {
  if (run.status === 'failed') {
    return {
      label: 'Failed',
      classes: 'border border-rose-200 bg-rose-100 text-rose-700',
    };
  }

  return {
    label: 'Successful',
    classes: 'border border-emerald-200 bg-emerald-100 text-emerald-700',
  };
}

function getGscFailureTitle(run: SeoGscRunRecord): string {
  if (run.errorCategory === 'auth') {
    return `Google Search Console auth expired ${formatRelativeTime(run.completedAt)}`;
  }

  if (run.errorCategory === 'permission') {
    return `Google Search Console access was denied ${formatRelativeTime(run.completedAt)}`;
  }

  if (run.errorCategory === 'config') {
    return 'Google Search Console configuration needs attention';
  }

  return `Google Search Console ingest failed ${formatRelativeTime(run.completedAt)}`;
}

function getGscFailureSummary(run: SeoGscRunRecord, health: SeoInsightsHealth): string {
  const freshnessSummary = health.lastWeekCovered
    ? `Finalized data is ready through ${health.finalizedThroughDate ?? 'unknown'}, but the latest loaded week is still ${health.lastWeekCovered}.`
    : `Finalized data is ready through ${health.finalizedThroughDate ?? 'unknown'}, but no finalized GSC week is loaded yet.`;

  if (run.remediation?.summary) {
    return `${run.remediation.summary} ${freshnessSummary}`;
  }

  return freshnessSummary;
}

function getEditorialStatusPill(
  run: SeoEditorialRunRecord | null,
  paused: boolean
): { label: string; classes: string } {
  if (paused) {
    return {
      label: 'Paused',
      classes: 'border border-red-300 bg-red-100 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200',
    };
  }

  if (!run) {
    return {
      label: 'Awaiting first run',
      classes: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    };
  }

  if (run.status === 'failed' || run.emailStatus === 'failed') {
    return {
      label: run.emailStatus === 'failed' && run.status !== 'failed' ? 'Email failed' : 'Failed',
      classes: 'border border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200',
    };
  }

  if (run.status === 'warning') {
    return {
      label: 'Partial success',
      classes: 'border border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200',
    };
  }

  return {
    label: 'Ready for review',
    classes: 'border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
  };
}

function getEditorialItemPill(
  action: SeoEditorialRunItem['action']
): { label: string; classes: string } {
  if (action === 'auto_published') {
    return {
      label: 'Auto-published',
      classes: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200',
    };
  }

  if (action === 'draft_for_review') {
    return {
      label: 'Draft for review',
      classes: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200',
    };
  }

  return {
    label: 'Skipped by gate',
    classes: 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  };
}

function isDigestLoopUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const normalized = new URL(value, 'https://letaiexplainai.com');
    return normalized.pathname === '/admin/seo-insights';
  } catch {
    return value === '/admin/seo-insights';
  }
}

function getSerperSummaryText(serper: SeoSerperUsageSummary): string {
  if (!serper.configured) {
    return 'Serper is not configured yet, so paid SERP sampling is unavailable.';
  }

  if (serper.pausedBySeoAgent) {
    return 'Serper is configured, but the global SEO pause switch is on, so paid discovery sampling is temporarily read-only.';
  }

  if (!serper.pricingEnabled) {
    return 'Serper is configured but disabled in pricing policy, so the discovery lane is staying read-only.';
  }

  if (serper.remainingCreditsSource === 'vendor_observed_adjusted') {
    return serper.lastSampledAt
      ? `Serper sampling is healthy. Balance is anchored to the last vendor billing observation, and the most recent paid sample ran ${formatRelativeTime(serper.lastSampledAt)}.`
      : 'Serper sampling is healthy. Balance is anchored to the last vendor billing observation and will keep stepping down as LAEA records new paid samples.';
  }

  if (serper.warningLevel === 'critical') {
    return serper.projectedDepletionDate
      ? `Serper usage is critical: credits could run out by ${formatDateTime(serper.projectedDepletionDate)} unless sampling slows down.`
      : 'Serper usage is critical: purchased credits are almost exhausted and new sampling should pause.';
  }

  if (serper.warningLevel === 'warning') {
    return serper.projectedDepletionDate
      ? `Serper usage needs attention: current burn projects depletion by ${formatDateTime(serper.projectedDepletionDate)}.`
      : 'Serper usage needs attention: burn has crossed the warning threshold.';
  }

  if (serper.warningLevel === 'watch') {
    return 'Serper usage is still within guardrails, but the burn rate is high enough to watch closely.';
  }

  if (serper.lastSampledAt) {
    return `Serper sampling is healthy. Last paid sample ran ${formatRelativeTime(serper.lastSampledAt)} and auto top-up remains off.`;
  }

  return 'Serper is configured and healthy, but no paid samples have been recorded yet.';
}

function getAgentBannerState(health: SeoInsightsHealth | null): 'first_run' | 'stale' | 'healthy' | 'failed' {
  if (!health?.agentRun) {
    return 'first_run';
  }

  if (health.agentRun.status === 'failed') {
    return 'failed';
  }

  const staleAfterMs = 7 * 24 * 60 * 60 * 1_000;
  const completedAt = new Date(health.agentRun.completedAt).getTime();
  return Date.now() - completedAt > staleAfterMs ? 'stale' : 'healthy';
}

export default function SeoInsightsPage() {
  const [bucket, setBucket] = useState<SeoInsightBucket>('winnable_loss');
  const [requestedWeek, setRequestedWeek] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SeoInsightListResult | null>(null);
  const [health, setHealth] = useState<SeoInsightsHealth | null>(null);
  const [editorialStatus, setEditorialStatus] = useState<SeoEditorialStatusResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [editorialError, setEditorialError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingInsightId, setPendingInsightId] = useState<string | null>(null);
  const [drawerInsightId, setDrawerInsightId] = useState<string | null>(null);
  const [digestDrawerOpen, setDigestDrawerOpen] = useState(false);
  const [pausePending, setPausePending] = useState(false);
  const [editorialPausePending, setEditorialPausePending] = useState(false);
  const [editorialResumeConfirmOpen, setEditorialResumeConfirmOpen] = useState(false);
  const [resumeConfirmOpen, setResumeConfirmOpen] = useState(false);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHealthError(null);
    setEditorialError(null);
    try {
      const [insightsResponse, healthResponse, editorialResponse] = await Promise.allSettled([
        seoInsightsApi.list({
          bucket,
          weekStart: requestedWeek,
          page,
          limit: 50,
        }),
        seoInsightsApi.getHealth(),
        seoInsightsApi.getEditorialStatus(),
      ]);

      if (insightsResponse.status === 'rejected') {
        throw insightsResponse.reason;
      }

      setResult(insightsResponse.value);

      if (healthResponse.status === 'fulfilled') {
        setHealth(healthResponse.value);
        setEditorialStatus(healthResponse.value.editorial ?? null);
      } else {
        setHealth(null);
        setHealthError(
          healthResponse.reason instanceof Error
            ? healthResponse.reason.message
            : 'Failed to load SEO automation status'
        );
      }

      if (editorialResponse.status === 'fulfilled') {
        setEditorialStatus(editorialResponse.value);
      } else {
        setEditorialError(
          editorialResponse.reason instanceof Error
            ? editorialResponse.reason.message
            : 'Failed to load Tuesday editorial status'
        );
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO insights');
    } finally {
      setLoading(false);
    }
  }, [bucket, page, requestedWeek]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const insights = result?.data ?? [];
  const agentBannerState = getAgentBannerState(health);
  const agentRun = health?.agentRun ?? null;
  const gscRun = health?.gscRun ?? null;
  const gscRunFailure = gscRun?.status === 'failed' ? gscRun : null;
  const digestStatusPill = agentRun ? getDigestStatusPill(agentRun) : null;
  const hasDedicatedDigestUrl = agentRun?.digestUrl ? !isDigestLoopUrl(agentRun.digestUrl) : false;
  const paused = health?.paused ?? false;
  const editorialPaused = editorialStatus?.paused ?? false;
  const editorialRun = editorialStatus?.run ?? null;
  const editorialPill = getEditorialStatusPill(editorialRun, editorialPaused);
  const serper = health?.serper ?? null;
  const counts = result?.meta.counts ?? {
    winnable_loss: 0,
    content_gap: 0,
    trend_signal: 0,
    decay: 0,
  };
  const effectiveWeek = result?.meta.weekStart ?? requestedWeek ?? '';
  const activeTab = BUCKET_TABS.find((tab) => tab.id === bucket);
  const bannerClasses =
    paused || agentBannerState === 'failed' || Boolean(gscRunFailure)
      ? 'border-red-300 bg-red-50 text-red-900'
      : agentBannerState === 'stale'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-green-200 bg-green-50 text-green-900';

  async function handleDismiss(id: string) {
    setPendingInsightId(id);
    try {
      await seoInsightsApi.dismiss(id);
      toast.success('Finding dismissed');
      if (drawerInsightId === id) {
        setDrawerInsightId(null);
      }
      await loadInsights();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to dismiss finding');
    } finally {
      setPendingInsightId(null);
    }
  }

  async function handleMarkActioned(id: string) {
    setPendingInsightId(id);
    try {
      await seoInsightsApi.markActioned(id);
      toast.success('Finding marked actioned');
      await loadInsights();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to update finding');
    } finally {
      setPendingInsightId(null);
    }
  }

  async function handlePauseChange(nextPaused: boolean) {
    setPausePending(true);
    try {
      const nextState = await seoInsightsApi.setPaused(nextPaused);
      setHealth((currentHealth) =>
        currentHealth
          ? {
              ...currentHealth,
              paused: nextState.paused,
            }
          : currentHealth
      );
      toast.success(nextPaused ? 'Auto-ship paused' : 'Auto-ship resumed');
      await loadInsights();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to update pause state');
    } finally {
      setPausePending(false);
      setResumeConfirmOpen(false);
    }
  }

  async function handleEditorialPauseChange(nextPaused: boolean) {
    setEditorialPausePending(true);
    try {
      const nextState = await seoInsightsApi.setEditorialPaused(nextPaused);
      setEditorialStatus((currentStatus) => ({
        paused: nextState.paused,
        run: currentStatus?.run ?? null,
      }));
      toast.success(nextPaused ? 'Tuesday autopilot paused' : 'Tuesday autopilot resumed');
      await loadInsights();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to update Tuesday autopilot');
    } finally {
      setEditorialPausePending(false);
      setEditorialResumeConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="seo-insights-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-blue-100">
              <Search className="h-3.5 w-3.5" />
              SEO Insights
            </div>
            <div className="mt-4 flex items-start gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Google’s signal, curated into action lanes.</h1>
              <HelpTooltip
                title="How to use Insights"
                description="Start here each week. Switch buckets to inspect deterministic Search Console findings, change the week to compare finalized windows, open detail for evidence and actions, and use the pause control only when you want to stop automated rewrites without losing visibility."
                buttonLabel="How to use SEO Insights"
                className="mt-1 border-white/15 bg-white/10 text-blue-100 hover:border-white/30 hover:bg-white/15 hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-blue-100"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-blue-100/85">
              Browse deterministic findings from Search Console, inspect the underlying evidence, and queue work without leaving the admin.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Current week</p>
              <p className="mt-2 text-lg font-semibold">{effectiveWeek || 'No data yet'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Active bucket</p>
              <p className="mt-2 text-lg font-semibold">{counts[bucket]}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Cadence</p>
              <p className="mt-2 text-lg font-semibold">Weekly finalized</p>
            </div>
          </div>
        </div>
      </header>

      <section
        className={`rounded-[28px] border px-5 py-5 shadow-sm transition-colors ${bannerClasses}`}
        data-testid="seo-ops-banner"
      >
        {healthError ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Automation status unavailable</p>
              <p className="mt-2 text-sm text-current/80">{healthError}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadInsights()}
              className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-white/80 px-4 py-2 text-sm font-medium text-current transition-colors hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              Retry status
            </button>
          </div>
        ) : health ? (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    paused
                      ? 'border border-red-300 bg-white/80 text-red-700'
                      : 'border border-green-200 bg-white/80 text-green-700'
                  }`}
                >
                  {paused ? <PauseCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {paused ? 'Paused' : 'Active'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-white/80 px-3 py-1 text-xs font-medium text-current">
                  <Clock3 className="h-3.5 w-3.5" />
                  GSC finalized through {health.finalizedThroughDate ?? 'unknown'}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {gscRunFailure && getGscFailureTitle(gscRunFailure)}
                  {!gscRunFailure && agentBannerState === 'first_run' && 'Weekly digest is not live yet'}
                  {!gscRunFailure && agentBannerState === 'failed' && `Last digest failed ${formatRelativeTime(agentRun?.completedAt ?? null)}`}
                  {!gscRunFailure && agentBannerState === 'stale' && `Last successful digest is stale (${formatRelativeTime(agentRun?.completedAt ?? null)})`}
                  {!gscRunFailure && agentBannerState === 'healthy' && `Last digest ran ${formatRelativeTime(agentRun?.completedAt ?? null)}`}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {gscRunFailure &&
                    getGscFailureSummary(gscRunFailure, health)}
                  {!gscRunFailure && agentBannerState === 'first_run' &&
                    'The weekly SEO agent has not reported a digest yet. The pause switch is ready now, and this banner will fill in once the Monday schedule starts posting run summaries.'}
                  {!gscRunFailure && agentBannerState === 'failed' &&
                    (agentRun?.errorMessage
                      ? `Failure reason: ${agentRun.errorMessage}`
                      : 'The most recent scheduled run reported a failure and needs attention before auto-ship resumes.')}
                  {!gscRunFailure && agentBannerState === 'stale' &&
                    'The latest successful digest is older than seven days, which usually means the weekly schedule missed a run or stopped reporting.'}
                  {!gscRunFailure && agentBannerState === 'healthy' &&
                    `Completed ${formatTimestamp(agentRun?.completedAt ?? null)} for week ${agentRun?.weekStart?.slice(0, 10) ?? 'unknown'}.`}
                </p>
                {agentRun?.serperSnapshot && (
                  <p className="mt-2 text-sm leading-6 text-slate-700" data-testid="seo-digest-serper-snapshot">
                    {getDigestSerperSnapshotText(agentRun.serperSnapshot)}
                  </p>
                )}
              </div>

              {gscRunFailure && (
                <div
                  className="rounded-2xl border border-rose-200 bg-white/90 p-4 text-slate-900 shadow-sm"
                  data-testid="seo-gsc-alert"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {gscRunFailure.requiresOperatorAction
                            ? 'Operator action required before SEO automation can trust fresh Search Console data.'
                            : 'The latest Search Console ingest failed, but this may clear on retry.'}
                        </p>
                        {gscRunFailure.errorMessage && (
                          <p className="mt-1 text-sm text-slate-700">
                            Latest failure: {gscRunFailure.errorMessage}
                          </p>
                        )}
                      </div>

                      {gscRunFailure.remediation?.command && (
                        <div className="rounded-xl bg-slate-950 px-3 py-3 text-slate-100">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Run From Repo Root
                          </p>
                          <code className="mt-2 block break-all text-xs sm:text-sm">
                            {gscRunFailure.remediation.command}
                          </code>
                        </div>
                      )}

                      {gscRunFailure.remediation?.docsPath && (
                        <p className="text-sm text-slate-700">
                          Runbook: <code>{gscRunFailure.remediation.docsPath}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-3 py-1 font-medium text-blue-800">
                  {agentRun ? `${agentRun.shippedCount} shipped` : 'Awaiting first digest'}
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 font-medium text-amber-800">
                  {agentRun ? `${agentRun.proposalCount} proposals` : '0 proposals yet'}
                </span>
                {agentRun && (
                  <span className="inline-flex items-center rounded-full border border-current/10 bg-white/80 px-3 py-1 font-medium text-current">
                    {agentRun.measuredCount} measured
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-current/10 bg-white/80 px-3 py-1 font-medium text-current">
                  Last GSC ingest {formatRelativeTime(health.lastRunAt)}
                </span>
              </div>

              {serper && (
                <div
                  className="rounded-2xl border border-current/10 bg-white/75 p-4 text-slate-900 shadow-sm"
                  data-testid="seo-serper-summary"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Serper spend
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getSerperWarningClasses(serper.warningLevel)}`}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {getSerperWarningLabel(serper.warningLevel)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {serper.autoTopupEnabled ? 'Auto top-up on' : 'Auto top-up off'}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-700">
                        {getSerperSummaryText(serper)}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">This week</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {serper.creditsUsedWeek.toLocaleString()} queries
                        </p>
                        <p className="text-slate-600">{formatUsd(serper.effectiveSpendWeekUsd)} modeled</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Modeled month</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {formatUsd(serper.effectiveSpendMonthUsd)}
                        </p>
                        <p className="text-slate-600">Budget {formatCount(serper.monthlyCreditBudget)} credits</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {getSerperBalanceLabel(serper.remainingCreditsSource)}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {formatCount(serper.remainingCredits)}
                        </p>
                        <p className="text-slate-600">
                          {getSerperBalanceDetail(
                            serper.remainingCreditsSource,
                            serper.remainingCreditsObservedAt ?? null,
                            `Tier ${serper.tierLabel ?? 'custom'} · Policy basis`
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sampling activity</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {formatDateTime(serper.lastSampledAt)}
                        </p>
                        <p className="text-slate-600">
                          {serper.projectedDepletionDate
                            ? `Projected depletion ${formatDateTime(serper.projectedDepletionDate)}`
                            : 'No depletion projected'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {agentRun && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDigestDrawerOpen(true)}
                    data-testid="view-digest-summary"
                    className="inline-flex items-center gap-2 rounded-full border border-current/15 bg-white/80 px-4 py-2 text-sm font-medium text-current transition-colors hover:bg-white"
                  >
                    <Clock3 className="h-4 w-4" />
                    View digest summary
                  </button>
                  <HelpTooltip
                    title="Digest summary"
                    description="Open the last weekly automation run summary. This shows what shipped, what turned into proposals, what stayed human-only, what was measured, and what Serper spend was recorded for that run."
                    buttonLabel="Explain digest summary"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={paused}
                  onClick={() => {
                    if (paused) {
                      setResumeConfirmOpen(true);
                      return;
                    }

                    void handlePauseChange(true);
                  }}
                  disabled={pausePending}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    paused
                      ? 'border-red-500 bg-red-600 text-white hover:bg-red-700'
                      : 'border-green-300 bg-white text-green-800 hover:bg-green-100'
                  }`}
                >
                  {paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                  {paused ? 'Resume auto-ship' : 'Pause auto-ship'}
                </button>
                <HelpTooltip
                  title="Pause auto-ship"
                  description="Pause stops automated rewrite shipping and other mutating SEO agent behavior, but keeps the dashboard, proposal queue, portfolio review, and other read-only surfaces available."
                  buttonLabel="Explain auto-ship pause controls"
                />
              </div>
            </div>
          </div>
        ) : (
          <LoadingSkeleton className="h-24 w-full rounded-2xl" />
        )}
      </section>

      <section
        className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        data-testid="seo-editorial-status-panel"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Tuesday editorial autopilot
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${editorialPill.classes}`}>
                {editorialPaused ? <PauseCircle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {editorialPill.label}
              </span>
              {editorialRun && (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Clock3 className="h-3.5 w-3.5" />
                  Completed {formatRelativeTime(editorialRun.completedAt)}
                </span>
              )}
            </div>

            {editorialError ? (
              <ErrorState
                title="Tuesday status unavailable"
                message={editorialError}
                onRetry={() => void loadInsights()}
              />
            ) : editorialStatus ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editorialRun
                      ? `Last Tuesday run: ${editorialRun.publishedCount} published, ${editorialRun.draftCount} drafts`
                      : 'No Tuesday editorial run recorded yet'}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {editorialRun
                      ? `Week ${editorialRun.weekStart?.slice(0, 10) ?? 'unknown'} produced ${editorialRun.skippedCount} skipped or deferred opportunities. Email status: ${editorialRun.emailStatus.replace('_', ' ')}.`
                      : 'The Tuesday runner is scheduled, but it has not persisted a non-dry run yet. Dry runs stay out of this operator record.'}
                  </p>
                  {editorialRun?.errorMessage && (
                    <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100">
                      {editorialRun.errorMessage}
                    </p>
                  )}
                </div>

                {editorialRun && editorialRun.items.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {editorialRun.items.slice(0, 6).map((item) => {
                      const itemPill = getEditorialItemPill(item.action);
                      return (
                        <article
                          key={`${item.sourceType}-${item.id}-${item.action}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${itemPill.classes}`}>
                              {itemPill.label}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {item.sourceType}
                            </span>
                          </div>
                          <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {item.reason}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.publicUrl && (
                              <a
                                href={item.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open public post
                              </a>
                            )}
                            {item.adminUrl && (
                              <a
                                href={item.adminUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/60"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit post
                              </a>
                            )}
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open source {item.sourceType}
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title={editorialRun ? 'No post actions in the latest run' : 'No Tuesday run yet'}
                    description={editorialRun
                      ? 'The runner found no publishable or draftable opportunities, so this run stayed review-only.'
                      : 'The first real Tuesday run will populate published posts, drafts for review, and skipped reasons here.'}
                  />
                )}
              </>
            ) : (
              <LoadingSkeleton className="h-28 w-full rounded-2xl" />
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <button
              type="button"
              aria-pressed={editorialPaused}
              onClick={() => {
                if (editorialPaused) {
                  setEditorialResumeConfirmOpen(true);
                  return;
                }

                void handleEditorialPauseChange(true);
              }}
              disabled={editorialPausePending || Boolean(editorialError)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                editorialPaused
                  ? 'border-red-500 bg-red-600 text-white hover:bg-red-700'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {editorialPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {editorialPaused ? 'Resume Tuesday autopilot' : 'Pause Tuesday autopilot'}
            </button>
            <Link
              to="/admin/seo-insights/proposals"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Review proposals
            </Link>
          </div>
        </div>
      </section>

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 pt-5 dark:border-gray-800">
          <Tabs
            tabs={BUCKET_TABS.map((tab) => ({
              id: tab.id,
              label: tab.label,
              count: counts[tab.id],
            }))}
            activeId={bucket}
            onChange={(nextBucket) => {
              startTransition(() => {
                setBucket(nextBucket as SeoInsightBucket);
                setPage(1);
              });
            }}
          />
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTab?.label}</h2>
                <HelpTooltip
                  title="Insight buckets"
                  description="Buckets are deterministic classification lanes. Zero is normal on a newer site. Use Winnable Losses for likely metadata wins, Content Gaps for missing destinations, Trend Signals for accelerating demand, and Decay for pages that are slipping."
                  buttonLabel="Explain insight buckets"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{activeTab?.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Week
                <HelpTooltip
                  title="Week selector"
                  description="Insights run on finalized weekly Search Console windows, not live intraday data. Use this to compare prior weeks when a bucket looks empty or when you want to see whether a finding is persistent."
                  buttonLabel="Explain week selector"
                  className="h-5 w-5 border-transparent bg-transparent text-slate-400 shadow-none hover:border-slate-200 hover:bg-white dark:bg-transparent dark:hover:bg-slate-900"
                />
                <select
                  value={effectiveWeek}
                  onChange={(event) => {
                    startTransition(() => {
                      setRequestedWeek(event.target.value || undefined);
                      setPage(1);
                    });
                  }}
                  className="bg-transparent font-medium text-gray-900 outline-none dark:text-white"
                >
                  {result?.meta.availableWeeks.map((weekStart) => (
                    <option key={weekStart} value={weekStart} className="text-gray-900">
                      {weekStart}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadInsights()}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
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
              title="Couldn't load SEO insights"
              message={error}
              onRetry={() => void loadInsights()}
            />
          </div>
        ) : insights.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No findings in this bucket"
              description={getEmptyStateDescription(bucket)}
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Query</th>
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Impr.</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3">CTR</th>
                    <th className="px-4 py-3">Pos.</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {insights.map((insight: SeoInsight) => (
                    <tr key={insight.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {insight.query ?? '(redacted)'}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {insight.evidence}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={insight.page}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[220px] items-center gap-2 text-sm text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                          title={insight.page}
                        >
                          <span className="truncate">{getPagePath(insight.page)}</span>
                          <ExternalLink className="h-4 w-4 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {insight.currentMetrics.impressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {insight.currentMetrics.clicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {formatPercent(insight.currentMetrics.ctr)}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {insight.currentMetrics.position.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {formatScore(insight.score)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            insight.status === 'actioned'
                              ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }
                        >
                          {insight.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawerInsightId(insight.id)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Open detail
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDismiss(insight.id)}
                            disabled={pendingInsightId === insight.id}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleMarkActioned(insight.id)}
                            disabled={pendingInsightId === insight.id}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Mark Actioned
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result && result.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {result.pagination.page} of {result.pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={result.pagination.page <= 1}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(result.pagination.totalPages, currentPage + 1))}
                    disabled={result.pagination.page >= result.pagination.totalPages}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <SeoInsightDrawer
        insightId={drawerInsightId}
        open={Boolean(drawerInsightId)}
        onClose={() => setDrawerInsightId(null)}
        onDismiss={async (id) => {
          await handleDismiss(id);
          setDrawerInsightId(null);
        }}
        onMarkActioned={async (id) => {
          await handleMarkActioned(id);
        }}
        onRewriteShipped={async (_action: SeoAgentActionRecord) => {
          await loadInsights();
        }}
        onProposalQueued={async () => {
          await loadInsights();
        }}
      />

      {agentRun && (
        <Drawer
          open={digestDrawerOpen}
          onClose={() => setDigestDrawerOpen(false)}
          title="Weekly digest summary"
          description="Review the latest SEO agent run without leaving the admin."
        >
          <div className="space-y-6 p-5" data-testid="seo-digest-summary-drawer">
            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Run snapshot</p>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {agentRun.status === 'failed' ? 'Last digest run failed' : 'Last digest run completed'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {agentRun.status === 'failed'
                      ? 'The weekly agent reported an error. Review the failure note and related queues before re-enabling trust in auto-ship.'
                      : 'This is the persisted summary from the most recent weekly SEO agent run.'}
                  </p>
                </div>
                {digestStatusPill && (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${digestStatusPill.classes}`}>
                    {digestStatusPill.label}
                  </span>
                )}
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Reviewed week</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {agentRun.weekStart ? agentRun.weekStart.slice(0, 10) : 'Unknown'}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Completed</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatTimestamp(agentRun.completedAt)}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Started</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatTimestamp(agentRun.startedAt)}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Digest age</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatRelativeTime(agentRun.completedAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Run totals</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Shipped</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-100">{agentRun.shippedCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Queued proposals</p>
                  <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-100">{agentRun.proposalCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Human-only findings</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{agentRun.humanOnlyCount}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Measured outcomes</p>
                  <p className="mt-1 text-xl font-semibold text-blue-900 dark:text-blue-100">{agentRun.measuredCount}</p>
                </div>
              </div>
            </section>

            {agentRun.errorMessage && (
              <section className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Failure note</p>
                <p className="mt-2 text-sm leading-6">{agentRun.errorMessage}</p>
              </section>
            )}

            {agentRun.serperSnapshot && (
              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Paid discovery snapshot</p>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getSerperWarningClasses(agentRun.serperSnapshot.warningLevel)}`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {getSerperWarningLabel(agentRun.serperSnapshot.warningLevel)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {agentRun.serperSnapshot.autoTopupEnabled ? 'Auto top-up on' : 'Auto top-up off'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {getDigestSerperSnapshotText(agentRun.serperSnapshot)}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Captured</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatTimestamp(agentRun.serperSnapshot.capturedAt)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/50">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Latest paid sample</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDateTime(agentRun.serperSnapshot.lastSampledAt)}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Continue in admin</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    Jump straight into the lanes that this digest likely changed.
                  </p>
                </div>
                {hasDedicatedDigestUrl && agentRun.digestUrl && (
                  <a
                    href={agentRun.digestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open linked digest
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/admin/seo-insights/actions"
                  onClick={() => setDigestDrawerOpen(false)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  View action log
                </Link>
                <Link
                  to="/admin/seo-insights/proposals"
                  onClick={() => setDigestDrawerOpen(false)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Review proposals
                </Link>
                <Link
                  to="/admin/seo-insights/portfolio"
                  onClick={() => setDigestDrawerOpen(false)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Check portfolio
                </Link>
                <Link
                  to="/admin/seo-insights/packaging"
                  onClick={() => setDigestDrawerOpen(false)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Check packaging
                </Link>
              </div>
            </section>
          </div>
        </Drawer>
      )}

      <ConfirmDialog
        isOpen={resumeConfirmOpen}
        title="Resume SEO auto-ship?"
        message="This turns weekly metadata rewrites back on for the SEO agent. Use this only when you’re comfortable letting the next digest ship qualifying blog rewrites again."
        confirmLabel="Resume auto-ship"
        cancelLabel="Keep paused"
        onCancel={() => setResumeConfirmOpen(false)}
        onConfirm={() => {
          void handlePauseChange(false);
        }}
        isLoading={pausePending}
      />

      <ConfirmDialog
        isOpen={editorialResumeConfirmOpen}
        title="Resume Tuesday editorial autopilot?"
        message="This lets the Tuesday runner create drafts and publish tightly gated topic-mode posts on its next non-dry run."
        confirmLabel="Resume Tuesday autopilot"
        cancelLabel="Keep paused"
        onCancel={() => setEditorialResumeConfirmOpen(false)}
        onConfirm={() => {
          void handleEditorialPauseChange(false);
        }}
        isLoading={editorialPausePending}
      />
    </div>
  );
}
