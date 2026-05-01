import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MinusCircle,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { SeoExperimentCheckpoint, SeoExperimentRecord } from '../../services/api';
import { Drawer } from '../ui';

interface SeoExperimentDrawerProps {
  experiment: SeoExperimentRecord | null;
  open: boolean;
  onClose: () => void;
  onReview: (experiment: SeoExperimentRecord) => Promise<void>;
  reviewPendingId: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Pending';
  }

  return new Date(value).toLocaleString();
}

function getStatusBadgeClasses(status: SeoExperimentRecord['status']): string {
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

function getCheckpointTone(checkpoint: SeoExperimentCheckpoint): string {
  switch (checkpoint.state) {
    case 'reviewed':
      return checkpoint.outcome === 'lost'
        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
        : checkpoint.outcome === 'won'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300';
    case 'due':
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300';
    case 'missed':
      return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300';
    case 'scheduled':
    default:
      return 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300';
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function SeoExperimentDrawer({
  experiment,
  open,
  onClose,
  onReview,
  reviewPendingId,
}: SeoExperimentDrawerProps) {
  if (!experiment) {
    return null;
  }

  const dueCheckpoint = experiment.checkpoints.find((checkpoint) => checkpoint.state === 'due') ?? null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={experiment.targetKeyword}
      description="Scheduled SEO experiment ledger for this action or proposal."
    >
      <div className="space-y-5 p-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(experiment.status)}`}>
              {experiment.status}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {experiment.variantType.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{experiment.hypothesis}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <a
              href={experiment.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900"
            >
              {experiment.targetUrl.replace('https://letaiexplainai.com', '')}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <span className="text-slate-500 dark:text-slate-400">
              Next review {formatDateTime(experiment.scheduledReviewAt)}
            </span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Before CTR"
            value={experiment.metricsBefore ? `${(experiment.metricsBefore.ctr * 100).toFixed(1)}%` : 'n/a'}
          />
          <MetricCard
            label="Before Impr."
            value={experiment.metricsBefore ? experiment.metricsBefore.impressions.toLocaleString() : 'n/a'}
          />
          <MetricCard
            label="Latest CTR"
            value={experiment.metricsAfter ? `${(experiment.metricsAfter.ctr * 100).toFixed(1)}%` : 'Pending'}
          />
          <MetricCard
            label="Latest Impr."
            value={experiment.metricsAfter ? experiment.metricsAfter.impressions.toLocaleString() : 'Pending'}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Target className="h-4 w-4" />
            Checkpoints
          </div>
          <div className="mt-4 space-y-3">
            {experiment.checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.label}
                className={`rounded-2xl border p-4 ${getCheckpointTone(checkpoint)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{checkpoint.label}</p>
                    <p className="mt-1 text-xs opacity-80">{formatDateTime(checkpoint.scheduledReviewAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                    {checkpoint.state === 'reviewed' ? (
                      checkpoint.outcome === 'won' ? <CheckCircle2 className="h-4 w-4" /> : checkpoint.outcome === 'lost' ? <XCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />
                    ) : checkpoint.state === 'due' ? (
                      <Clock3 className="h-4 w-4" />
                    ) : checkpoint.state === 'missed' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    {checkpoint.state}
                  </div>
                </div>
                {checkpoint.metricsAfter && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                    <p>{checkpoint.metricsAfter.impressions.toLocaleString()} impr.</p>
                    <p>{checkpoint.metricsAfter.clicks.toLocaleString()} clicks</p>
                    <p>{(checkpoint.metricsAfter.ctr * 100).toFixed(1)}% CTR</p>
                    <p>Pos {checkpoint.metricsAfter.avgPosition.toFixed(1)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {experiment.topicPod && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Topic pod context</p>
            <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">{experiment.topicPod.hypothesis}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-white">Canonical:</span> {experiment.topicPod.canonicalDestination.path}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Move type:</span> {experiment.topicPod.moveType.replace(/_/g, ' ')}</p>
            </div>
          </section>
        )}

        <section className="flex flex-wrap justify-end gap-3">
          {dueCheckpoint && (
            <button
              type="button"
              onClick={() => void onReview(experiment)}
              disabled={reviewPendingId === experiment.id}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reviewPendingId === experiment.id ? 'Reviewing…' : `Review ${dueCheckpoint.label}`}
            </button>
          )}
        </section>
      </div>
    </Drawer>
  );
}

export default SeoExperimentDrawer;
