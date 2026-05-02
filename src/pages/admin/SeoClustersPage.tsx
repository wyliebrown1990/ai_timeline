import { ExternalLink, RefreshCw, Sparkles, Waypoints } from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SeoClusterDrawer } from '../../components/admin/SeoClusterDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { EmptyState, ErrorState, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoClusterBucket,
  type SeoClusterHorizon,
  type SeoClusterListResult,
  type SeoClusterOpportunity,
} from '../../services/api';

const CLUSTER_BUCKET_TABS: Array<{ id: SeoClusterBucket; label: string; description: string }> = [
  {
    id: 'cluster_content_gap',
    label: 'Content Gaps',
    description: 'Recurring topic families still landing on generic or weak destinations.',
  },
  {
    id: 'cluster_near_win',
    label: 'Near Wins',
    description: 'Clustered demand already landing on a page that should win more clicks.',
  },
  {
    id: 'cluster_topic_theme',
    label: 'Topic Themes',
    description: 'Demand fragmented across several close variants that may need a broader pod.',
  },
];

const HORIZON_OPTIONS: Array<{ id: SeoClusterHorizon; label: string }> = [
  { id: '28d', label: '28 days' },
  { id: '90d', label: '90 days' },
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

function getEmptyStateDescription(bucket: SeoClusterBucket, horizon: SeoClusterHorizon): string {
  if (bucket === 'cluster_content_gap') {
    return `No ${horizon} clustered gaps cleared the noise threshold yet. That is normal on a newer site while demand is still thin and fragmented.`;
  }

  if (bucket === 'cluster_near_win') {
    return `No ${horizon} clustered near-win pages are underperforming enough to justify action yet.`;
  }

  return `No ${horizon} clustered topic themes are visible right now. Try another horizon or refresh after the next finalized Search Console window.`;
}

export default function SeoClustersPage() {
  const [bucket, setBucket] = useState<SeoClusterBucket>('cluster_content_gap');
  const [horizon, setHorizon] = useState<SeoClusterHorizon>('90d');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SeoClusterListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingClusterId, setPendingClusterId] = useState<string | null>(null);
  const [drawerClusterId, setDrawerClusterId] = useState<string | null>(null);

  const loadClusters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listClusters({
        horizon,
        bucket,
        page,
        limit: 25,
      });
      setResult(nextResult);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load clustered SEO opportunities');
    } finally {
      setLoading(false);
    }
  }, [bucket, horizon, page]);

  useEffect(() => {
    void loadClusters();
  }, [loadClusters]);

  const clusters = result?.data ?? [];
  const counts = result?.meta.counts ?? {
    cluster_content_gap: 0,
    cluster_near_win: 0,
    cluster_topic_theme: 0,
  };
  const activeTab = CLUSTER_BUCKET_TABS.find((tab) => tab.id === bucket);
  const windowLabel = result?.meta.windowStart && result.meta.windowEnd
    ? `${result.meta.windowStart} to ${result.meta.windowEnd}`
    : 'No clustered window yet';

  async function handleDismiss(id: string) {
    setPendingClusterId(id);
    try {
      await seoInsightsApi.dismissCluster(id);
      toast.success('Cluster dismissed');
      if (drawerClusterId === id) {
        setDrawerClusterId(null);
      }
      await loadClusters();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to dismiss cluster');
    } finally {
      setPendingClusterId(null);
    }
  }

  async function handleMarkActioned(id: string) {
    setPendingClusterId(id);
    try {
      await seoInsightsApi.markClusterActioned(id);
      toast.success('Cluster marked actioned');
      await loadClusters();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to update cluster');
    } finally {
      setPendingClusterId(null);
    }
  }

  async function handleGenerateProposal(id: string) {
    setPendingClusterId(id);
    try {
      const proposal = await seoInsightsApi.generateClusterProposal(id);
      toast.success(`Proposal queued for ${proposal.targetKeyword}`);
      await loadClusters();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to generate proposal');
    } finally {
      setPendingClusterId(null);
    }
  }

  return (
    <div className="space-y-6" data-testid="seo-clusters-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
              <Waypoints className="h-3.5 w-3.5" />
              SEO Clusters
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Longer windows, fewer false negatives, clearer topic demand.</h1>
            <p className="mt-3 text-sm leading-6 text-cyan-100/85">
              Mine finalized 28-day and 90-day Search Console windows for clustered opportunities that exact weekly query rows miss on a newer site.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Active horizon</p>
              <p className="mt-2 text-lg font-semibold">{horizon}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Visible rows</p>
              <p className="mt-2 text-lg font-semibold">{clusters.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Window</p>
              <p className="mt-2 text-lg font-semibold">{result?.meta.windowEnd ?? 'Pending'}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTab?.label}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{activeTab?.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{windowLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="radiogroup"
                aria-label="Cluster horizon"
                className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800"
              >
                {HORIZON_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={horizon === option.id}
                    onClick={() => {
                      startTransition(() => {
                        setHorizon(option.id);
                        setPage(1);
                      });
                    }}
                    className={
                      horizon === option.id
                        ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                        : 'rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadClusters()}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-4">
            <Tabs
              tabs={CLUSTER_BUCKET_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: counts[tab.id],
              }))}
              activeId={bucket}
              onChange={(nextBucket) => {
                startTransition(() => {
                  setBucket(nextBucket as SeoClusterBucket);
                  setPage(1);
                });
              }}
            />
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
              title="Couldn't load clustered SEO opportunities"
              message={error}
              onRetry={() => void loadClusters()}
            />
          </div>
        ) : clusters.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No clustered opportunities in this bucket"
              description={getEmptyStateDescription(bucket, horizon)}
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Representative Query</th>
                    <th className="px-4 py-3">Primary Page</th>
                    <th className="px-4 py-3">Impr.</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3">CTR</th>
                    <th className="px-4 py-3">Pos.</th>
                    <th className="px-4 py-3">Variants</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {clusters.map((cluster: SeoClusterOpportunity) => (
                    <tr key={cluster.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 dark:text-white">{cluster.representativeQuery}</p>
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{cluster.evidence}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={cluster.primaryPage}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[220px] items-center gap-2 text-sm text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                          title={cluster.primaryPage}
                        >
                          <span className="truncate">{getPagePath(cluster.primaryPage)}</span>
                          <ExternalLink className="h-4 w-4 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{cluster.currentMetrics.impressions.toLocaleString()}</td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{cluster.currentMetrics.clicks.toLocaleString()}</td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{formatPercent(cluster.currentMetrics.ctr)}</td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{cluster.currentMetrics.position.toFixed(1)}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                          {cluster.memberQueryCount} q / {cluster.memberPageCount} p
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{formatScore(cluster.score)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawerClusterId(cluster.id)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Open detail
                          </button>
                          {cluster.bucket !== 'cluster_near_win' && (
                            <button
                              type="button"
                              onClick={() => void handleGenerateProposal(cluster.id)}
                              disabled={pendingClusterId === cluster.id}
                              className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                            >
                              Generate proposal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDismiss(cluster.id)}
                            disabled={pendingClusterId === cluster.id}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleMarkActioned(cluster.id)}
                            disabled={pendingClusterId === cluster.id}
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

      <SeoClusterDrawer
        clusterId={drawerClusterId}
        open={Boolean(drawerClusterId)}
        onClose={() => setDrawerClusterId(null)}
        onDismiss={async (id) => {
          await handleDismiss(id);
          setDrawerClusterId(null);
        }}
        onMarkActioned={async (id) => {
          await handleMarkActioned(id);
        }}
        onGenerateProposal={async (id) => {
          await handleGenerateProposal(id);
        }}
      />
    </div>
  );
}
