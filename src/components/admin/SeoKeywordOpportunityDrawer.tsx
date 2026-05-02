import { AlertTriangle, Archive, ArrowUpRight, Compass, Layers3, RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react';
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
  onArchive: (opportunity: SeoKeywordOpportunityRecord) => Promise<void>;
  archivePendingId: string | null;
  onRefreshSerp: (opportunity: SeoKeywordOpportunityRecord) => Promise<void>;
  refreshPendingId: string | null;
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

function getStatusBadge(status: SeoKeywordOpportunityRecord['status']) {
  switch (status) {
    case 'promoted':
      return {
        label: 'Promoted',
        icon: Sparkles,
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      };
    case 'archived':
      return {
        label: 'Archived',
        icon: Archive,
        className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
    case 'discovered':
      return {
        label: 'Discovered',
        icon: Search,
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
      };
    case 'scored':
    default:
      return {
        label: 'Scored',
        icon: Layers3,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
      };
  }
}

function formatScore(value: number): string {
  return `${Math.round(value)}/100`;
}

function getScoreBand(value: number, inverse = false): 'high' | 'medium' | 'low' {
  const effective = inverse ? 100 - value : value;
  if (effective >= 70) {
    return 'high';
  }

  if (effective >= 40) {
    return 'medium';
  }

  return 'low';
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

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + (days * 24 * 60 * 60 * 1000));
}

function getSerperRefreshState(sourceRef: SeoKeywordOpportunitySerperSourceRef): {
  canRefresh: boolean;
  nextEligibleLabel: string | null;
} {
  const sampledAt = new Date(sourceRef.sampledAt);
  if (Number.isNaN(sampledAt.getTime())) {
    return {
      canRefresh: true,
      nextEligibleLabel: null,
    };
  }

  const nextEligibleAt = addDays(sampledAt, 7);
  return {
    canRefresh: Date.now() >= nextEligibleAt.getTime(),
    nextEligibleLabel: nextEligibleAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

function hasUnavailableSource(opportunity: SeoKeywordOpportunityRecord): boolean {
  if (opportunity.sourceType === 'gsc_cluster') {
    return !isClusterSourceRef(opportunity.sourceRef);
  }

  if (opportunity.sourceType === 'serp_sample') {
    return !isSerperSourceRef(opportunity.sourceRef);
  }

  return false;
}

function buildDemandExplanation(opportunity: SeoKeywordOpportunityRecord): string {
  const sourceRef = opportunity.sourceRef;
  const band = getScoreBand(opportunity.demandProxy);
  const intro = `Demand is ${Math.round(opportunity.demandProxy)}/100, which reads as ${band} search interest for this topic right now.`;

  if (isClusterSourceRef(sourceRef)) {
    return `${intro} Search Console clustering found ${sourceRef.impressions.toLocaleString()} impressions across ${sourceRef.memberQueryCount} visible query variants between ${sourceRef.windowStart} and ${sourceRef.windowEnd}.`;
  }

  if (isSerperSourceRef(sourceRef)) {
    return `${intro} This row keeps the demand signal from its original ${sourceRef.originSourceType.replace(/_/g, ' ')} shortlist and now carries a cached live SERP sample through ${formatDateTime(sourceRef.expiresAt)}.`;
  }

  if (opportunity.sourceType === 'google_trends') {
    return `${intro} Google Trends surfaced this as a live external topic before LAEA committed paid SERP sampling to it.`;
  }

  if (opportunity.sourceType === 'editorial_seed') {
    return `${intro} This is a manual editorial seed, so the demand score reflects operator judgment rather than exact GSC volume.`;
  }

  return intro;
}

function buildCompetitionExplanation(opportunity: SeoKeywordOpportunityRecord): string {
  const sourceRef = opportunity.sourceRef;
  const band = getScoreBand(opportunity.competitionProxy, true);
  const intro = `Competition is ${Math.round(opportunity.competitionProxy)}/100, which reads as ${band} room to win relative to the current search landscape.`;

  if (isSerperSourceRef(sourceRef)) {
    const topDomains = sourceRef.topDomains.slice(0, 3).join(', ');
    return `${intro} The live Serper sample saw ${sourceRef.organicCount} organic results, ${sourceRef.peopleAlsoAskCount} People Also Ask blocks, and top domains like ${topDomains || 'the current top page set'}, which is why the score stays explainable instead of opaque.`;
  }

  if (isClusterSourceRef(sourceRef)) {
    return `${intro} This row has not been manually refreshed against a live SERP sample yet, so competition is still a lightweight heuristic based on the clustered query behavior and destination fit.`;
  }

  if (opportunity.sourceType === 'google_trends') {
    return `${intro} Trends-first rows start with a conservative proxy until Serper or proposal review adds direct SERP evidence.`;
  }

  if (opportunity.sourceType === 'editorial_seed') {
    return `${intro} Editorial seeds use the manually assigned competition proxy until the discovery system enriches them with live sampling.`;
  }

  return intro;
}

function buildFitExplanation(opportunity: SeoKeywordOpportunityRecord): string {
  const sourceRef = opportunity.sourceRef;
  const band = getScoreBand(opportunity.laeaFitScore);
  const targetLabel = opportunity.targetUrl
    ? opportunity.targetUrl.replace('https://letaiexplainai.com', '')
    : 'a new destination';
  const intro = `LAEA fit is ${Math.round(opportunity.laeaFitScore)}/100, which reads as ${band} alignment with LAEA's existing information architecture and internal-link potential.`;

  if (isClusterSourceRef(sourceRef)) {
    return `${intro} The current recommendation is ${opportunity.pageTypeRecommendation.replace(/_/g, ' ')} at ${targetLabel}, with ${sourceRef.internalLinkCount} mapped internal-link opportunities already visible from the cluster planner.`;
  }

  if (isSerperSourceRef(sourceRef)) {
    return `${intro} The current recommendation is ${opportunity.pageTypeRecommendation.replace(/_/g, ' ')} at ${targetLabel}, and the live SERP sample keeps us honest about whether that destination type still matches what searchers are being shown.`;
  }

  return `${intro} The current recommendation is ${opportunity.pageTypeRecommendation.replace(/_/g, ' ')} at ${targetLabel}.`;
}

function getInternalLinkOpportunities(opportunity: SeoKeywordOpportunityRecord) {
  if (!isClusterSourceRef(opportunity.sourceRef)) {
    return [];
  }

  return opportunity.sourceRef.internalLinkOpportunities ?? [];
}

export function SeoKeywordOpportunityDrawer({
  opportunity,
  open,
  onClose,
  onPromote,
  promotePendingId,
  onArchive,
  archivePendingId,
  onRefreshSerp,
  refreshPendingId,
}: SeoKeywordOpportunityDrawerProps) {
  if (!opportunity) {
    return null;
  }

  const sourceBadge = getSourceBadge(opportunity.sourceType);
  const SourceIcon = sourceBadge.icon;
  const statusBadge = getStatusBadge(opportunity.status);
  const StatusIcon = statusBadge.icon;
  const canPromote = (
    opportunity.status === 'scored'
    && opportunity.pageTypeRecommendation === 'blog_post'
    && (Boolean(opportunity.clusterSnapshotId) || Boolean(opportunity.targetUrl))
  );
  const canArchive = opportunity.status === 'discovered' || opportunity.status === 'scored';
  const sourceRef = opportunity.sourceRef;
  const serperRefreshState = isSerperSourceRef(sourceRef) && opportunity.sourceType === 'serp_sample'
    ? getSerperRefreshState(sourceRef)
    : null;
  const showUnavailableSource = hasUnavailableSource(opportunity);
  const refreshIsPending = refreshPendingId === opportunity.id;
  const archiveIsPending = archivePendingId === opportunity.id;
  const linkedEntities = getInternalLinkOpportunities(opportunity);
  const clusterLinkedEntityCount = isClusterSourceRef(sourceRef) ? sourceRef.internalLinkCount : 0;
  const showActionRow = Boolean(
    canPromote
    || canArchive
    || opportunity.status === 'promoted'
    || opportunity.targetUrl
    || serperRefreshState
  );

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
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusBadge.label}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{opportunity.rationale}</p>
          {showUnavailableSource ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Source unavailable. The original {opportunity.sourceType === 'serp_sample' ? 'SERP sample' : 'cluster provenance'} is no longer attached, so keep this row for operator context but treat its lineage as stale.
                </p>
              </div>
            </div>
          ) : null}
          {showActionRow && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
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
                {canArchive && (
                  <button
                    type="button"
                    onClick={() => void onArchive(opportunity)}
                    disabled={archiveIsPending}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Archive className="h-4 w-4" />
                    {archiveIsPending ? 'Archiving…' : 'Archive opportunity'}
                  </button>
                )}
                {serperRefreshState && (
                  <button
                    type="button"
                    onClick={() => void onRefreshSerp(opportunity)}
                    disabled={!serperRefreshState.canRefresh || refreshIsPending}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshIsPending ? 'animate-spin' : ''}`} />
                    {refreshIsPending ? 'Refreshing SERP…' : 'Refresh SERP sample'}
                  </button>
                )}
                {opportunity.targetUrl && (
                  <a
                    href={opportunity.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900"
                  >
                    Open target
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>
              {serperRefreshState && (
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {serperRefreshState.canRefresh
                    ? 'Manual refresh is available because this SERP evidence is at least 7 days old.'
                    : `Manual refresh unlocks ${serperRefreshState.nextEligibleLabel ?? 'after the 7-day cooldown'} to keep Serper spend intentional.`}
                </p>
              )}
            </div>
          )}
        </section>

        {isSerperSourceRef(sourceRef) ? (
          <section
            data-testid="seo-serper-paid-sample-card"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/25"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Search className="h-3.5 w-3.5" />
                Paid SERP sample
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {sourceRef.country.toUpperCase()} · {sourceRef.language.toUpperCase()} · {sourceRef.dateRange || 'default'} · page {sourceRef.page}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              This Serper sample already spent {formatUsd(sourceRef.effectiveCostUsd)} and stays cached until {formatDateTime(sourceRef.expiresAt)}.
              Until then, the portfolio can reuse this evidence without sending another paid query.
            </p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Demand" value={formatScore(opportunity.demandProxy)} />
          <MetricCard label="Competition" value={formatScore(opportunity.competitionProxy)} />
          <MetricCard label="LAEA fit" value={formatScore(opportunity.laeaFitScore)} />
          <MetricCard label="Overall" value={opportunity.overallScore.toFixed(1)} />
        </section>

        <details
          open
          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white">
            Why these scores
          </summary>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Demand</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{buildDemandExplanation(opportunity)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Competition</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{buildCompetitionExplanation(opportunity)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">LAEA fit</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{buildFitExplanation(opportunity)}</p>
            </div>
          </div>
        </details>

        {(linkedEntities.length > 0 || clusterLinkedEntityCount > 0) ? (
          <details
            className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20"
            open
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-sky-900 dark:text-sky-100">
              Linked entities from LAEA's graph
            </summary>
            <div className="mt-4 space-y-3">
              {linkedEntities.length > 0 ? linkedEntities.map((item) => (
                <div
                  key={`${item.entityType}:${item.path}`}
                  className="rounded-2xl border border-sky-200/70 bg-white/80 p-3 dark:border-sky-900/30 dark:bg-slate-900/70"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.path}</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{item.reason}</p>
                </div>
              )) : (
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {clusterLinkedEntityCount} linked entity{clusterLinkedEntityCount === 1 ? '' : 'ies'} are already mapped for this cluster opportunity. Rebuild the portfolio to hydrate the full detail cards into this drawer.
                </p>
              )}
            </div>
          </details>
        ) : null}

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
              {showUnavailableSource
                ? 'Source unavailable. The original lineage record is no longer attached, so this opportunity stays visible for review without source detail.'
                : 'This opportunity does not have an attached source record yet.'}
            </p>
          )}
        </section>
      </div>
    </Drawer>
  );
}

export default SeoKeywordOpportunityDrawer;
