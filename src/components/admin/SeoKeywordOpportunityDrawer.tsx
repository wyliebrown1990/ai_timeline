import { ArrowUpRight, Compass, Layers3, Search, TrendingUp } from 'lucide-react';
import type {
  SeoKeywordOpportunityClusterSourceRef,
  SeoKeywordOpportunityRecord,
  SeoKeywordOpportunitySerperSourceRef,
  SeoKeywordOpportunitySourceRef,
} from '../../services/api';
import { Drawer } from '../ui';

interface SeoKeywordOpportunityDrawerProps {
  opportunity: SeoKeywordOpportunityRecord | null;
  open: boolean;
  onClose: () => void;
  onPromote: (opportunity: SeoKeywordOpportunityRecord) => Promise<void>;
  promotePendingId: string | null;
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

function isSerperSourceRef(
  sourceRef: SeoKeywordOpportunitySourceRef | null,
): sourceRef is SeoKeywordOpportunitySerperSourceRef {
  return Boolean(sourceRef && 'vendor' in sourceRef && sourceRef.vendor === 'serper');
}

function isClusterSourceRef(
  sourceRef: SeoKeywordOpportunitySourceRef | null,
): sourceRef is SeoKeywordOpportunityClusterSourceRef {
  return Boolean(sourceRef && 'clusterId' in sourceRef);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function SeoKeywordOpportunityDrawer({
  opportunity,
  open,
  onClose,
  onPromote,
  promotePendingId,
}: SeoKeywordOpportunityDrawerProps) {
  if (!opportunity) {
    return null;
  }

  const sourceBadge = getSourceBadge(opportunity.sourceType);
  const SourceIcon = sourceBadge.icon;
  const canPromote = (
    opportunity.status === 'scored'
    && opportunity.pageTypeRecommendation === 'blog_post'
    && (Boolean(opportunity.clusterSnapshotId) || Boolean(opportunity.targetUrl))
  );
  const sourceRef = opportunity.sourceRef;

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
            <div className="mt-4 flex flex-wrap gap-2">
              {canPromote && (
                <button
                  type="button"
                  onClick={() => void onPromote(opportunity)}
                  disabled={promotePendingId === opportunity.id}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {promotePendingId === opportunity.id ? 'Queueing proposal…' : 'Queue proposal'}
                </button>
              )}
              {opportunity.status === 'promoted' && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Already promoted
                </span>
              )}
              <a
                href={opportunity.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900"
              >
                Open target
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
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
            {isSerperSourceRef(sourceRef) ? <Search className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}
            Source detail
          </div>
          {isClusterSourceRef(sourceRef) ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-900 dark:text-white">Window:</span> {sourceRef.windowStart} to {sourceRef.windowEnd}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Cluster bucket:</span> {sourceRef.bucket.replace(/_/g, ' ')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Representative query:</span> {sourceRef.representativeQuery}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Primary page:</span> {sourceRef.primaryPage.replace('https://letaiexplainai.com', '')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Canonical path:</span> {sourceRef.canonicalPath}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Move type:</span> {sourceRef.moveType.replace(/_/g, ' ')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Visible query variants:</span> {sourceRef.memberQueryCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Page count:</span> {sourceRef.memberPageCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Impressions:</span> {sourceRef.impressions.toLocaleString()}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Avg. position:</span> {sourceRef.position.toFixed(1)}</p>
            </div>
          ) : isSerperSourceRef(sourceRef) ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-900 dark:text-white">Sampled query:</span> {sourceRef.query}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Origin source:</span> {sourceRef.originSourceType.replace(/_/g, ' ')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Locale:</span> {sourceRef.country.toUpperCase()} · {sourceRef.language.toUpperCase()}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Date range:</span> {sourceRef.dateRange || 'default'} · page {sourceRef.page}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Sampled at:</span> {formatDateTime(sourceRef.sampledAt)}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Cache expires:</span> {formatDateTime(sourceRef.expiresAt)}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Organic results:</span> {sourceRef.organicCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">People Also Ask:</span> {sourceRef.peopleAlsoAskCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Related searches:</span> {sourceRef.relatedSearchCount}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Sample cost:</span> {formatUsd(sourceRef.effectiveCostUsd)}</p>
              <p className="sm:col-span-2"><span className="font-semibold text-slate-900 dark:text-white">Top domains:</span> {sourceRef.topDomains.length > 0 ? sourceRef.topDomains.join(', ') : 'No organic domains captured'}</p>
              <p className="sm:col-span-2"><span className="font-semibold text-slate-900 dark:text-white">Competition note:</span> {sourceRef.competitionReason}</p>
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
