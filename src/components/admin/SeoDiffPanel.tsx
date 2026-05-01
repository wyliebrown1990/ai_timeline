import { ArrowRight, FileDiff, RotateCcw } from 'lucide-react';
import type { SeoAgentActionRecord } from '../../services/api';
import { Drawer } from '../ui';

interface SeoDiffPanelProps {
  action: SeoAgentActionRecord | null;
  open: boolean;
  onClose: () => void;
}

function FieldDiffCard({
  label,
  before,
  after,
}: {
  label: string;
  before: string | null;
  after: string | null;
}) {
  const changed = (before ?? '') !== (after ?? '');

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/70">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
        <span
          className={
            changed
              ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }
        >
          {changed ? 'Changed' : 'Unchanged'}
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Before</p>
          <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">{before || '—'}</p>
        </div>
        <div className="flex justify-center py-2 text-gray-400">
          <ArrowRight className="h-4 w-4" />
        </div>
        <div
          className={
            changed
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/30'
              : 'rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900'
          }
        >
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">After</p>
          <p className="mt-2 text-sm leading-6 text-gray-900 dark:text-white">{after || '—'}</p>
        </div>
      </div>
    </section>
  );
}

export function SeoDiffPanel({ action, open, onClose }: SeoDiffPanelProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={action?.targetLabel ?? 'SEO action diff'}
      description={action ? 'Inspect the exact metadata change and its audit context.' : 'Compare before and after metadata.'}
    >
      {action ? (
        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                <FileDiff className="h-3.5 w-3.5" />
                {action.actionType}
              </span>
              <span
                className={
                  action.status === 'rolled_back'
                    ? 'inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }
              >
                {action.status === 'rolled_back' && <RotateCcw className="h-3.5 w-3.5" />}
                {action.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">{action.rationale}</p>
          </section>

          <FieldDiffCard
            label="SEO Title"
            before={action.before.seoTitle}
            after={action.after.seoTitle}
          />

          <FieldDiffCard
            label="SEO Description"
            before={action.before.seoDescription}
            after={action.after.seoDescription}
          />
        </div>
      ) : null}
    </Drawer>
  );
}

export default SeoDiffPanel;
