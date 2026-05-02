import { FlaskConical, RefreshCw, Sparkles } from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SeoExperimentDrawer } from '../../components/admin/SeoExperimentDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { EmptyState, ErrorState, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoExperimentCheckpoint,
  type SeoExperimentListResult,
  type SeoExperimentRecord,
  type SeoExperimentStatus,
  type SeoExperimentStatusFilter,
} from '../../services/api';

const STATUS_TABS: Array<{ id: SeoExperimentStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'planned', label: 'Planned' },
  { id: 'running', label: 'Running' },
  { id: 'won', label: 'Won' },
  { id: 'flat', label: 'Flat' },
  { id: 'lost', label: 'Lost' },
];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function getStatusBadgeClasses(status: SeoExperimentStatus): string {
  switch (status) {
    case 'won':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'flat':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'lost':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'running':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'archived':
      return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    case 'planned':
    default:
      return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
  }
}

function getCheckpointDotClasses(checkpoint: SeoExperimentCheckpoint): string {
  switch (checkpoint.state) {
    case 'reviewed':
      return checkpoint.outcome === 'won'
        ? 'bg-emerald-500'
        : checkpoint.outcome === 'lost'
          ? 'bg-rose-500'
          : 'bg-amber-500';
    case 'due':
      return 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/40';
    case 'missed':
      return 'bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/40';
    case 'scheduled':
    default:
      return 'border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900';
  }
}

export default function SeoExperimentsPage() {
  const [status, setStatus] = useState<SeoExperimentStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SeoExperimentListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<SeoExperimentRecord | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listExperiments({
        status,
        page,
        limit: 25,
      });
      setResult(nextResult);
      setSelectedExperiment((current) =>
        current ? nextResult.data.find((experiment) => experiment.id === current.id) ?? current : current
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO experiments');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadExperiments();
  }, [loadExperiments]);

  async function handleReview(experiment: SeoExperimentRecord) {
    setReviewPendingId(experiment.id);
    try {
      const updated = await seoInsightsApi.reviewExperiment(experiment.id);
      setSelectedExperiment(updated);
      toast.success(`Reviewed ${experiment.targetKeyword}`);
      await loadExperiments();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to review experiment');
    } finally {
      setReviewPendingId(null);
    }
  }

  const experiments = result?.data ?? [];
  const counts = result?.meta.counts ?? {
    all: 0,
    planned: 0,
    running: 0,
    won: 0,
    flat: 0,
    lost: 0,
    archived: 0,
  };
  const dueCount = result?.meta.dueCount ?? 0;

  return (
    <div className="space-y-6" data-testid="seo-experiments-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">
              <FlaskConical className="h-3.5 w-3.5" />
              SEO Experiments
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Measure every SEO bet instead of trusting vibes.</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-100/85">
              Track D+14, D+28, and D+56 checkpoints for metadata rewrites and cluster-backed editorial moves.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">All experiments</p>
              <p className="mt-2 text-lg font-semibold">{counts.all}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Due for review</p>
              <p className="mt-2 text-lg font-semibold">{dueCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Running</p>
              <p className="mt-2 text-lg font-semibold">{counts.running}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Experiment ledger</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Each row is a scheduled measurement loop, not just a proposal artifact.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadExperiments()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
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
                  setStatus(nextStatus as SeoExperimentStatusFilter);
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
              title="Couldn't load SEO experiments"
              message={error}
              onRetry={() => void loadExperiments()}
            />
          </div>
        ) : counts.all === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No experiments yet"
              description="Link a draft to a proposal or ship a metadata rewrite to start the measurement ledger."
            />
          </div>
        ) : experiments.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<FlaskConical className="h-6 w-6" />}
              title="No experiments in this status"
              description="Try another status filter or refresh after the next approval event."
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Keyword</th>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3">Next review</th>
                    <th className="px-4 py-3">Checkpoints</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {experiments.map((experiment) => {
                    const dueCheckpoint = experiment.checkpoints.find((checkpoint) => checkpoint.state === 'due') ?? null;
                    return (
                      <tr key={experiment.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{experiment.targetKeyword}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{experiment.targetUrl.replace('https://letaiexplainai.com', '')}</p>
                        </td>
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{experiment.variantType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{formatDateTime(experiment.scheduledReviewAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {experiment.checkpoints.map((checkpoint) => (
                              <span
                                key={`${experiment.id}:${checkpoint.label}`}
                                title={`${checkpoint.label} · ${formatDateTime(checkpoint.scheduledReviewAt)}`}
                                className={`h-3 w-3 rounded-full ${getCheckpointDotClasses(checkpoint)}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(experiment.status)}`}>
                            {experiment.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedExperiment(experiment)}
                              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              View detail
                            </button>
                            {dueCheckpoint && (
                              <button
                                type="button"
                                onClick={() => void handleReview(experiment)}
                                disabled={reviewPendingId === experiment.id}
                                className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewPendingId === experiment.id ? 'Reviewing…' : `Review ${dueCheckpoint.label}`}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      <SeoExperimentDrawer
        experiment={selectedExperiment}
        open={selectedExperiment !== null}
        onClose={() => setSelectedExperiment(null)}
        onReview={handleReview}
        reviewPendingId={reviewPendingId}
      />
    </div>
  );
}
