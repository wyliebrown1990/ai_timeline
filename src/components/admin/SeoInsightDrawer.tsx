import { Copy, ExternalLink, FileText, Gauge, LineChart, MousePointerClick, SearchSlash, Sparkles, WandSparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  seoInsightsApi,
  type SeoAgentActionRecord,
  type SeoInsightDetail,
  type SeoProposalRecord,
  type SeoRewriteProposal,
} from '../../services/api';
import { getProposalToastContent, getProposalToastTone } from '../../lib/seoProposalFeedback';
import { Drawer, ErrorState, LoadingSkeleton } from '../ui';

interface SeoInsightDrawerProps {
  insightId: string | null;
  open: boolean;
  onClose: () => void;
  onDismiss: (id: string) => Promise<void>;
  onMarkActioned: (id: string) => Promise<void>;
  onRewriteShipped: (action: SeoAgentActionRecord) => Promise<void>;
  onProposalQueued: () => Promise<void>;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetricValue(metric: 'impressions' | 'clicks' | 'ctr' | 'position', value: number): string {
  if (metric === 'ctr') {
    return formatPercent(value);
  }
  if (metric === 'position') {
    return value.toFixed(1);
  }
  return Math.round(value).toLocaleString();
}

function buildSparklinePoints(values: number[], invert = false): string {
  if (values.length === 0) {
    return '';
  }

  const width = 220;
  const height = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const normalized = invert ? (max - value) / range : (value - min) / range;
      const y = height - (normalized * height);
      return `${x},${y}`;
    })
    .join(' ');
}

function isBlogPostPage(pageUrl: string): boolean {
  try {
    return /^\/blog\/[^/]+$/.test(new URL(pageUrl).pathname);
  } catch {
    return /^\/blog\/[^/]+$/.test(pageUrl);
  }
}

async function copyAIBlogDraftBrief(proposal: SeoRewriteProposal) {
  const command = `/AIBlogDraft topic: ${proposal.query}: ${proposal.rationale}`;
  await navigator.clipboard.writeText(command);
}

function SparklineCard({
  title,
  values,
  colorClass,
  metric,
  invert = false,
}: {
  title: string;
  values: number[];
  colorClass: string;
  metric: 'impressions' | 'clicks' | 'ctr' | 'position';
  invert?: boolean;
}) {
  const latestValue = values[values.length - 1] ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {formatMetricValue(metric, latestValue)}
          </p>
        </div>
        <div className={`rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
          {values.length} pts
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 p-2 dark:bg-gray-900">
        <svg viewBox="0 0 220 70" className="h-[70px] w-full" aria-hidden="true">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points={buildSparklinePoints(values, invert)}
            className={colorClass.split(' ')[1] ?? 'text-blue-600'}
          />
        </svg>
      </div>
    </div>
  );
}

export function SeoInsightDrawer({
  insightId,
  open,
  onClose,
  onDismiss,
  onMarkActioned,
  onRewriteShipped,
  onProposalQueued,
}: SeoInsightDrawerProps) {
  const [detail, setDetail] = useState<SeoInsightDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [proposal, setProposal] = useState<SeoRewriteProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [shippingRewrite, setShippingRewrite] = useState(false);
  const [contentProposal, setContentProposal] = useState<SeoProposalRecord | null>(null);
  const [contentProposalLoading, setContentProposalLoading] = useState(false);
  const [contentProposalError, setContentProposalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !insightId) {
      setDetail(null);
      setError(null);
      setProposal(null);
      setProposalError(null);
      setContentProposal(null);
      setContentProposalError(null);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      const nextInsightId = insightId;
      if (!nextInsightId) {
        return;
      }

      setLoading(true);
      setError(null);
      setProposal(null);
      setProposalError(null);
      setContentProposal(null);
      setContentProposalError(null);
      try {
        const nextDetail = await seoInsightsApi.get(nextInsightId);
        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load insight detail');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [insightId, open]);

  const trend = detail?.trend ?? [];
  const rewriteEligible = Boolean(detail && detail.bucket === 'winnable_loss' && isBlogPostPage(detail.page));
  const contentProposalEligible = Boolean(
    detail && (detail.bucket === 'content_gap' || detail.bucket === 'trend_signal')
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={detail?.query ?? 'SEO insight detail'}
      description={detail?.bucket ? `Bucket: ${detail.bucket.replace('_', ' ')}` : 'Inspect the underlying signals before you act.'}
    >
      {loading ? (
        <div className="space-y-4 p-5">
          <LoadingSkeleton className="h-28 w-full rounded-2xl" />
          <LoadingSkeleton className="h-48 w-full rounded-2xl" />
          <LoadingSkeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-5">
          <ErrorState
            title="Couldn't load this finding"
            message={error}
            onRetry={() => {
              if (insightId) {
                setDetail(null);
                setError(null);
                setLoading(true);
                void seoInsightsApi.get(insightId)
                  .then((nextDetail) => setDetail(nextDetail))
                  .catch((nextError) => {
                    setError(nextError instanceof Error ? nextError.message : 'Failed to load insight detail');
                  })
                  .finally(() => setLoading(false));
              }
            }}
          />
        </div>
      ) : detail ? (
        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Landing Page</p>
                <a
                  href={detail.page}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  {detail.page}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                {detail.status}
              </div>
            </div>
            {detail.canonicalPath && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                Canonical target: <span className="font-medium text-gray-900 dark:text-white">{detail.canonicalPath}</span>
              </p>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <MousePointerClick className="h-4 w-4" />
                Current metrics
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Impressions</dt>
                  <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {detail.currentMetrics.impressions.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Clicks</dt>
                  <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {detail.currentMetrics.clicks.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">CTR</dt>
                  <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {formatPercent(detail.currentMetrics.ctr)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Position</dt>
                  <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {detail.currentMetrics.position.toFixed(1)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <Gauge className="h-4 w-4" />
                Baseline
              </div>
              {detail.baselineMetrics ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Impressions</dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {detail.baselineMetrics.impressions.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Clicks</dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {detail.baselineMetrics.clicks.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">CTR</dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {formatPercent(detail.baselineMetrics.ctr)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Position</dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {detail.baselineMetrics.position.toFixed(1)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  No baseline available for this bucket yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <SearchSlash className="h-4 w-4" />
              Evidence
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">{detail.evidence}</p>
            <div className="mt-4 rounded-xl bg-blue-50 px-3 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <span className="font-semibold">Suggested action:</span> {detail.suggestedAction}
            </div>
          </section>

          {rewriteEligible && (
            <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-900 dark:text-violet-100">
                    <WandSparkles className="h-4 w-4" />
                    Auto-ship metadata lane
                  </div>
                  <p className="mt-2 text-sm leading-6 text-violet-900/80 dark:text-violet-100/80">
                    This finding can propose a title + description rewrite for the underlying blog post. Generate a proposal first, then ship only if it clears the confidence bar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!detail || proposalLoading || shippingRewrite) {
                      return;
                    }

                    setProposalLoading(true);
                    setProposalError(null);
                    try {
                      const nextProposal = await seoInsightsApi.proposeRewrite(detail.id);
                      setProposal(nextProposal);
                    } catch (nextError) {
                      setProposalError(nextError instanceof Error ? nextError.message : 'Failed to generate rewrite proposal');
                    } finally {
                      setProposalLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={proposalLoading || shippingRewrite || detail.status === 'shipped'}
                >
                  <Sparkles className="h-4 w-4" />
                  {proposalLoading ? 'Proposing…' : detail.status === 'shipped' ? 'Already shipped' : 'Propose rewrite'}
                </button>
              </div>

              {proposalError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  {proposalError}
                </div>
              )}

              {proposal && (
                <div className="mt-5 space-y-4" data-testid="seo-rewrite-proposal">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Current metadata</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">SEO Title</p>
                          <p className="mt-1 text-sm leading-6 text-gray-900 dark:text-white">{proposal.currentTitle}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">SEO Description</p>
                          <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">{proposal.currentDescription}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Proposed metadata</p>
                        <span
                          className={
                            proposal.confidence >= 0.8
                              ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }
                        >
                          Confidence {proposal.confidence.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">SEO Title</p>
                          <p className="mt-1 text-sm leading-6 text-gray-900 dark:text-white">{proposal.proposedTitle}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">SEO Description</p>
                          <p className="mt-1 text-sm leading-6 text-gray-900 dark:text-white">{proposal.proposedDescription}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Rationale</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{proposal.rationale}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {proposal.confidence >= 0.8 ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!detail || shippingRewrite) {
                            return;
                          }

                          setShippingRewrite(true);
                          setProposalError(null);
                          try {
                            const action = await seoInsightsApi.shipRewrite(detail.id);
                            setDetail((currentDetail) => currentDetail ? { ...currentDetail, status: 'shipped' } : currentDetail);
                            toast.success('Rewrite shipped. Review it in SEO Actions.');
                            await onRewriteShipped(action);
                          } catch (nextError) {
                            setProposalError(nextError instanceof Error ? nextError.message : 'Failed to ship rewrite');
                          } finally {
                            setShippingRewrite(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={shippingRewrite}
                      >
                        <WandSparkles className="h-4 w-4" />
                        {shippingRewrite ? 'Shipping…' : 'Ship it'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await copyAIBlogDraftBrief(proposal);
                            toast.success('Copied a prefilled /AIBlogDraft brief');
                          } catch (nextError) {
                            toast.error(nextError instanceof Error ? nextError.message : 'Failed to copy /AIBlogDraft brief');
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-gray-950 dark:text-violet-300 dark:hover:bg-violet-950/30"
                      >
                        <Copy className="h-4 w-4" />
                        Send to /AIBlogDraft
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {contentProposalEligible && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                    <FileText className="h-4 w-4" />
                    Editorial proposal lane
                  </div>
                  <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
                    Turn this search finding into a thesis-shaped editorial brief, queue it in SEO Proposals, and keep drafting human-reviewed before anything reaches `/AIBlogDraft`.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!detail || contentProposalLoading || contentProposal || detail.status === 'dismissed' || detail.status === 'shipped') {
                      return;
                    }

                    setContentProposalLoading(true);
                    setContentProposalError(null);
                    try {
                      const nextProposal = await seoInsightsApi.generateProposal(detail.id);
                      setContentProposal(nextProposal);
                      if (nextProposal.status !== 'rejected') {
                        setDetail((currentDetail) => currentDetail ? { ...currentDetail, status: 'actioned' } : currentDetail);
                      }
                      const toastContent = getProposalToastContent(nextProposal);
                      if (getProposalToastTone(nextProposal) === 'error') {
                        toast.error(toastContent);
                      } else {
                        toast.success(toastContent);
                      }
                      await onProposalQueued();
                    } catch (nextError) {
                      setContentProposalError(nextError instanceof Error ? nextError.message : 'Failed to generate proposal');
                    } finally {
                      setContentProposalLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    contentProposalLoading ||
                    Boolean(contentProposal) ||
                    detail.status === 'dismissed' ||
                    detail.status === 'shipped'
                  }
                >
                  <Sparkles className="h-4 w-4" />
                  {contentProposalLoading
                    ? 'Generating…'
                    : contentProposal
                      ? 'Queued in proposals'
                      : detail.status === 'dismissed'
                        ? 'Dismissed'
                        : detail.status === 'shipped'
                          ? 'Already shipped'
                          : 'Generate proposal'}
                </button>
              </div>

              {contentProposalError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  {contentProposalError}
                </div>
              )}

              {contentProposal && (
                <div className="mt-5 space-y-4" data-testid="seo-content-proposal">
                  <div className="rounded-2xl border border-white/70 bg-white/90 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        {contentProposal.status}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        Confidence {contentProposal.confidence.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        {contentProposal.sourceBucket?.replace('_', ' ') ?? 'proposal'}
                      </span>
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Suggested angle</p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{contentProposal.suggestedAngle}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{contentProposal.rationale}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-gray-950/60">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Target keyword</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{contentProposal.targetKeyword}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-gray-950/60">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Link inventory</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{contentProposal.linkInventory.length} entities</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900/40 dark:bg-gray-950/60">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">News hooks</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{contentProposal.newsHooks.length} recent articles</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/admin/seo-insights/proposals"
                      className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:bg-gray-950 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Review in SEO Proposals
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <LineChart className="h-4 w-4" />
              4-week trend
            </div>
            {trend.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No historical sparkline data yet.
              </div>
            ) : (
              <div className="grid gap-3">
                <SparklineCard
                  title="Impressions"
                  values={trend.map((point) => point.impressions)}
                  colorClass="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  metric="impressions"
                />
                <SparklineCard
                  title="Clicks"
                  values={trend.map((point) => point.clicks)}
                  colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  metric="clicks"
                />
                <SparklineCard
                  title="CTR"
                  values={trend.map((point) => point.ctr)}
                  colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  metric="ctr"
                />
                <SparklineCard
                  title="Position"
                  values={trend.map((point) => point.position)}
                  colorClass="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  metric="position"
                  invert
                />
              </div>
            )}
          </section>

          <section className="sticky bottom-0 flex gap-3 border-t border-gray-200 bg-white/95 pt-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <button
              type="button"
              onClick={async () => {
                if (!detail || mutating) {
                  return;
                }

                setMutating(true);
                try {
                  await onDismiss(detail.id);
                } finally {
                  setMutating(false);
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              disabled={mutating}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!detail || mutating) {
                  return;
                }

                setMutating(true);
                try {
                  await onMarkActioned(detail.id);
                } finally {
                  setMutating(false);
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={mutating}
            >
              Mark Actioned
            </button>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

export default SeoInsightDrawer;
