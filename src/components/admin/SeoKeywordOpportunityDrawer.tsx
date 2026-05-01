import { ArrowUpRight, Compass, Layers3, Search, TrendingUp } from 'lucide-react';
import type { SeoKeywordOpportunityRecord } from '../../services/api';
import { Drawer } from '../ui';

interface SeoKeywordOpportunityDrawerProps {
  opportunity: SeoKeywordOpportunityRecord | null;
  open: boolean;
  onClose: () => void;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function getSourceBadge(sourceType: SeoKeywordOpportunityRecord['sourceType']) {
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

function formatScore(value: number): string {
  return `${Math.round(value)}/100`;
}

export function SeoKeywordOpportunityDrawer({
  opportunity,
  open,
  onClose,
}: SeoKeywordOpportunityDrawerProps) {
  if (!opportunity) {
    return null;
  }

  const sourceBadge = getSourceBadge(opportunity.sourceType);
  const SourceIcon = sourceBadge.icon;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={opportunity.seedQuery}
      description="Scored keyword opportunity from the SEO discovery backlog."
    >
      <div className="space-y-5 p-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${sourceBadge.className}`}>
              <SourceIcon className="h-3.5 w-3.5" />
              {sourceBadge.label}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {opportunity.pageTypeRecommendation.replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              {opportunity.status}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{opportunity.rationale}</p>
          {opportunity.targetUrl && (
            <a
              href={opportunity.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900"
            >
              Open target
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Demand" value={formatScore(opportunity.demandProxy)} />
          <MetricCard label="Competition" value={formatScore(opportunity.competitionProxy)} />
          <MetricCard label="LAEA fit" value={formatScore(opportunity.laeaFitScore)} />
          <MetricCard label="Overall" value={opportunity.overallScore.toFixed(1)} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Layers3 className="h-4 w-4" />
            Source detail
          </div>
          {opportunity.sourceRef ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-900 dark:text-white">Window:</span> {opportunity.sourceRef.windowStart} to {opportunity.sourceRef.windowEnd}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Cluster bucket:</span> {opportunity.sourceRef.bucket.replace(/_/g, ' ')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Representative query:</span> {opportunity.sourceRef.representativeQuery}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Primary page:</span> {opportunity.sourceRef.primaryPage.replace('https://letaiexplainai.com', '')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Canonical path:</span> {opportunity.sourceRef.canonicalPath}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Move type:</span> {opportunity.sourceRef.moveType.replace(/_/g, ' ')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Visible query variants:</span> {opportunity.sourceRef.memberQueryCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Page count:</span> {opportunity.sourceRef.memberPageCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Impressions:</span> {opportunity.sourceRef.impressions.toLocaleString()}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Avg. position:</span> {opportunity.sourceRef.position.toFixed(1)}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              This opportunity does not have an attached source record yet.
            </p>
          )}
        </section>
      </div>
    </Drawer>
  );
}

export default SeoKeywordOpportunityDrawer;
