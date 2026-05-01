import { ExternalLink, FolderKanban, Layers3, Search, Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  seoInsightsApi,
  type SeoClusterOpportunityDetail,
} from '../../services/api';
import { Drawer, ErrorState, LoadingSkeleton } from '../ui';

interface SeoClusterDrawerProps {
  clusterId: string | null;
  open: boolean;
  onClose: () => void;
  onDismiss: (id: string) => Promise<void>;
  onMarkActioned: (id: string) => Promise<void>;
  onGenerateProposal: (id: string) => Promise<void>;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function formatPath(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname || pageUrl;
  } catch {
    return pageUrl;
  }
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function SeoClusterDrawer({
  clusterId,
  open,
  onClose,
  onDismiss,
  onMarkActioned,
  onGenerateProposal,
}: SeoClusterDrawerProps) {
  const [detail, setDetail] = useState<SeoClusterOpportunityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    if (!open || !clusterId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      const nextClusterId = clusterId;
      if (!nextClusterId) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextDetail = await seoInsightsApi.getCluster(nextClusterId);
        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load cluster detail');
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
  }, [clusterId, open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={detail?.representativeQuery ?? 'Cluster detail'}
      description={detail ? `${detail.horizon} clustered opportunity` : 'Inspect the member queries and landing pages.'}
    >
      {loading ? (
        <div className="space-y-4 p-5">
          <LoadingSkeleton className="h-28 w-full rounded-2xl" />
          <LoadingSkeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-5">
          <ErrorState
            title="Couldn't load this cluster"
            message={error}
            onRetry={() => {
              if (clusterId) {
                setDetail(null);
                setError(null);
                setLoading(true);
                void seoInsightsApi.getCluster(clusterId)
                  .then((nextDetail) => setDetail(nextDetail))
                  .catch((nextError) => {
                    setError(nextError instanceof Error ? nextError.message : 'Failed to load cluster detail');
                  })
                  .finally(() => setLoading(false));
              }
            }}
          />
        </div>
      ) : detail ? (
        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    {detail.bucket.replace('cluster_', '').replace('_', ' ')}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                    {detail.status}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                    {detail.windowStart} to {detail.windowEnd}
                  </span>
                </div>
                <p className="max-w-xl text-sm leading-6 text-gray-700 dark:text-gray-300">{detail.evidence}</p>
              </div>
              <a
                href={detail.primaryPage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-gray-800"
              >
                {formatPath(detail.primaryPage)}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Search className="h-4 w-4" />} label="Impressions" value={detail.currentMetrics.impressions.toLocaleString()} />
            <MetricCard icon={<Sparkles className="h-4 w-4" />} label="CTR" value={formatPercent(detail.currentMetrics.ctr)} />
            <MetricCard icon={<Layers3 className="h-4 w-4" />} label="Variants" value={detail.memberQueryCount.toLocaleString()} />
            <MetricCard icon={<FolderKanban className="h-4 w-4" />} label="Pages" value={`${detail.memberPageCount} • score ${formatScore(detail.score)}`} />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Member queries</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {detail.memberQueries.map((member) => (
                <div key={member.query} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_88px_72px_72px_72px] sm:items-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{member.query}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.impressions.toLocaleString()} impr.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.clicks.toLocaleString()} clicks</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{formatPercent(member.ctr)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pos {member.position.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Landing pages inside the cluster</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {detail.memberPages.map((member) => (
                <div key={`${member.page}-${member.path}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_88px_72px_72px_72px] sm:items-center">
                  <a
                    href={member.page}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    <span className="truncate">{member.path}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.impressions.toLocaleString()} impr.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.clicks.toLocaleString()} clicks</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{formatPercent(member.ctr)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pos {member.position.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap justify-end gap-3">
            {detail.bucket !== 'cluster_near_win' && (
              <button
                type="button"
                onClick={async () => {
                  if (!detail) {
                    return;
                  }

                  setMutating(true);
                  try {
                    await onGenerateProposal(detail.id);
                  } finally {
                    setMutating(false);
                  }
                }}
                disabled={mutating}
                className="rounded-full border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
              >
                Generate proposal
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!detail) {
                  return;
                }

                setMutating(true);
                try {
                  await onDismiss(detail.id);
                } finally {
                  setMutating(false);
                }
              }}
              disabled={mutating}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!detail) {
                  return;
                }

                setMutating(true);
                try {
                  await onMarkActioned(detail.id);
                } finally {
                  setMutating(false);
                }
              }}
              disabled={mutating}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mark Actioned
            </button>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

export default SeoClusterDrawer;
