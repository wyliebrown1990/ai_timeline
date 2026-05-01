import { CheckCircle2, Eye, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SeoDiffPanel } from '../../components/admin/SeoDiffPanel';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoAgentActionRecord,
  type SeoActionListResult,
  type SeoActionStatusFilter,
} from '../../services/api';

const STATUS_FILTERS: Array<{ id: SeoActionStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'rolled_back', label: 'Rolled Back' },
  { id: 'measured', label: 'Measured' },
];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function SeoActionsPage() {
  const [status, setStatus] = useState<SeoActionStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SeoActionListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRollbackId, setPendingRollbackId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<SeoAgentActionRecord | null>(null);
  const [diffAction, setDiffAction] = useState<SeoAgentActionRecord | null>(null);

  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listActions({
        status,
        page,
        limit: 25,
      });
      setResult(nextResult);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO actions');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const actions = result?.data ?? [];
  const summary = actions.reduce(
    (accumulator, action) => {
      accumulator.total += 1;
      if (action.status === 'shipped') accumulator.shipped += 1;
      if (action.status === 'rolled_back') accumulator.rolledBack += 1;
      if (action.status === 'measured') accumulator.measured += 1;
      return accumulator;
    },
    { total: 0, shipped: 0, rolledBack: 0, measured: 0 }
  );

  async function handleRollback(action: SeoAgentActionRecord) {
    setPendingRollbackId(action.id);
    try {
      const updatedAction = await seoInsightsApi.rollbackAction(action.id);
      toast.success('Rewrite rolled back');
      setConfirmingAction(null);
      setDiffAction((current) => (current?.id === updatedAction.id ? updatedAction : current));
      await loadActions();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to roll back rewrite');
    } finally {
      setPendingRollbackId(null);
    }
  }

  return (
    <div className="space-y-6" data-testid="seo-actions-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              SEO Actions
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Audit every shipped metadata move before it drifts.</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-100/85">
              Review what the SEO agent changed, inspect the exact before/after diff, and roll back in one click if a rewrite misses the bar.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Rows loaded</p>
              <p className="mt-2 text-lg font-semibold">{summary.total}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Rolled back</p>
              <p className="mt-2 text-lg font-semibold">{summary.rolledBack}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Measured</p>
              <p className="mt-2 text-lg font-semibold">{summary.measured}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent audit log</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Start with shipped rows, then use rollback only when the metadata underperforms or drifts off-voice.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setStatus(filter.id);
                        setPage(1);
                      });
                    }}
                    className={
                      status === filter.id
                        ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                        : 'rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadActions()}
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
              title="Couldn't load SEO actions"
              message={error}
              onRetry={() => void loadActions()}
            />
          </div>
        ) : actions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No actions in this filter"
              description="Once a metadata rewrite ships, it will appear here with the full audit trail and rollback controls."
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Shipped At</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Buttons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {actions.map((action) => (
                    <tr key={action.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{formatDateTime(action.shippedAt)}</td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{action.actionType.replace('_', ' ')}</td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 dark:text-white">{action.targetLabel}</p>
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{action.targetPath}</p>
                          {action.query && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Query: {action.query}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{action.confidence.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            action.status === 'rolled_back'
                              ? 'rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                              : action.status === 'measured'
                                ? 'rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }
                        >
                          {action.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDiffAction(action)}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Diff
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingAction(action)}
                            disabled={action.status === 'rolled_back' || pendingRollbackId === action.id}
                            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Rollback
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

      <SeoDiffPanel
        action={diffAction}
        open={Boolean(diffAction)}
        onClose={() => setDiffAction(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmingAction)}
        title="Roll back this rewrite?"
        message={
          confirmingAction
            ? `This will restore the prior seoTitle and seoDescription for "${confirmingAction.targetLabel}".`
            : 'This will restore the prior SEO metadata.'
        }
        confirmLabel="Rollback rewrite"
        destructive
        isLoading={Boolean(confirmingAction && pendingRollbackId === confirmingAction.id)}
        onCancel={() => {
          if (!pendingRollbackId) {
            setConfirmingAction(null);
          }
        }}
        onConfirm={() => {
          if (confirmingAction) {
            void handleRollback(confirmingAction);
          }
        }}
      />
    </div>
  );
}
