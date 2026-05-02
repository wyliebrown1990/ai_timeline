import { ArrowUpRight, Route, TriangleAlert, Wrench } from 'lucide-react';
import type {
  SeoPackagingAuditRecord,
  SeoPackagingExistingProposalSummary,
  SeoPackagingIssueRecord,
} from '../../services/api';
import { Drawer } from '../ui';

interface SeoPackagingDrawerProps {
  audit: SeoPackagingAuditRecord | null;
  open: boolean;
  onClose: () => void;
  onProposeEvergreen: (audit: SeoPackagingAuditRecord) => Promise<void>;
  onProposeFix: (audit: SeoPackagingAuditRecord) => Promise<void>;
  onViewExistingPackagingProposal: (proposal: SeoPackagingExistingProposalSummary) => void;
  proposePendingId: string | null;
  proposeFixPendingId: string | null;
}

function getExistingPackagingProposalLabel(proposal: SeoPackagingExistingProposalSummary): string {
  switch (proposal.status) {
    case 'approved':
      return 'View approved proposal';
    case 'drafting':
      return 'View drafting proposal';
    case 'shipped':
      return 'View shipped proposal';
    case 'pending':
    default:
      return 'View queued proposal';
  }
}

function getSeverityClasses(severity: SeoPackagingIssueRecord['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'warning':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'info':
    default:
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300';
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

export function SeoPackagingDrawer({
  audit,
  open,
  onClose,
  onProposeEvergreen,
  onProposeFix,
  onViewExistingPackagingProposal,
  proposePendingId,
  proposeFixPendingId,
}: SeoPackagingDrawerProps) {
  if (!audit) {
    return null;
  }

  const hasPackagingFixOpportunity = audit.issues.some((issue) => issue.type !== 'evergreen_routing');
  const existingPackagingFixProposal = audit.existingPackagingFixProposal;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={audit.pagePath}
      description="Read-only SERP packaging audit for an impression-bearing page."
    >
      <div className="space-y-5 p-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              {audit.pageType.replace(/_/g, ' ')}
            </span>
            {audit.experimentActive && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Active experiment
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p><span className="font-semibold text-slate-900 dark:text-white">Title:</span> {audit.title ?? 'Missing'}</p>
            <p><span className="font-semibold text-slate-900 dark:text-white">H1:</span> {audit.h1 ?? 'Missing'}</p>
            <p><span className="font-semibold text-slate-900 dark:text-white">Canonical:</span> {audit.canonicalPath ?? 'Missing'}</p>
          </div>
          <a
            href={audit.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900"
          >
            Open page
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Impressions" value={audit.impressions.toLocaleString()} />
          <MetricCard label="Clicks" value={audit.clicks.toLocaleString()} />
          <MetricCard label="CTR" value={`${(audit.ctr * 100).toFixed(1)}%`} />
          <MetricCard label="Avg. position" value={audit.position.toFixed(1)} />
        </section>

        {audit.evergreenRecommendation && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              <Route className="h-4 w-4" />
              Evergreen routing recommendation
            </div>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {audit.evergreenRecommendation.rationale}
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Current</p>
                <p className="mt-2 text-sm font-semibold text-rose-900 dark:text-rose-100">{audit.pagePath}</p>
                <p className="mt-2 text-sm text-rose-900/80 dark:text-rose-100/80">
                  Repeated query demand is still landing on a transient or generic news destination.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Recommended</p>
                <p className="mt-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">{audit.evergreenRecommendation.targetPath}</p>
                <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                  {audit.evergreenRecommendation.targetLabel} · {audit.evergreenRecommendation.moveType.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void onProposeEvergreen(audit)}
                disabled={proposePendingId === audit.id}
                className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
              >
                {proposePendingId === audit.id ? 'Queueing…' : 'Queue routing proposal'}
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <TriangleAlert className="h-4 w-4" />
                Packaging issues
              </div>
              {hasPackagingFixOpportunity && existingPackagingFixProposal ? (
                <button
                  type="button"
                  onClick={() => onViewExistingPackagingProposal(existingPackagingFixProposal)}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {getExistingPackagingProposalLabel(existingPackagingFixProposal)}
                </button>
              ) : hasPackagingFixOpportunity ? (
                <button
                  type="button"
                  onClick={() => void onProposeFix(audit)}
                  disabled={proposeFixPendingId === audit.id}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                >
                  {proposeFixPendingId === audit.id ? 'Queueing…' : 'Queue packaging fix'}
                </button>
              ) : null}
            </div>
          <div className="mt-4 space-y-3">
            {audit.issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {issue.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{issue.label}</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{issue.details}</p>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">Recommended fix:</span> {issue.recommendedFix}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Wrench className="h-4 w-4" />
            Structured data coverage
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {audit.structuredDataTypes.length > 0 ? audit.structuredDataTypes.map((type) => (
              <span
                key={type}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {type}
              </span>
            )) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">No structured data expected for this route right now.</span>
            )}
          </div>
        </section>
      </div>
    </Drawer>
  );
}

export default SeoPackagingDrawer;
