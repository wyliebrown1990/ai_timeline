import { RefreshCw, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SeoPackagingDrawer } from '../../components/admin/SeoPackagingDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { EmptyState, ErrorState, HelpTooltip, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  ApiError,
  seoInsightsApi,
  type SeoPackagingAuditListResult,
  type SeoPackagingAuditRecord,
  type SeoPackagingExistingProposalSummary,
} from '../../services/api';

type PackagingFilter = 'all' | 'critical' | 'warning' | 'info';

const FILTER_TABS: Array<{ id: PackagingFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'info', label: 'Info' },
];

function getSeverityLabel(audit: SeoPackagingAuditRecord): PackagingFilter {
  if (audit.criticalCount > 0) {
    return 'critical';
  }

  if (audit.issues.some((issue) => issue.severity === 'warning')) {
    return 'warning';
  }

  return 'info';
}

function getSeverityBadgeClasses(filter: PackagingFilter): string {
  switch (filter) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'warning':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'info':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300';
    case 'all':
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function hasPackagingFixOpportunity(audit: SeoPackagingAuditRecord): boolean {
  return audit.issues.some((issue) => issue.type !== 'evergreen_routing');
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

function getProposalStatusQueryParam(status: SeoPackagingExistingProposalSummary['status']): 'pending' | 'drafting' | 'approved' {
  if (status === 'drafting' || status === 'approved') {
    return status;
  }

  return 'pending';
}

function normalizeExistingPackagingProposalStatus(value: unknown): SeoPackagingExistingProposalSummary['status'] | null {
  if (value === 'pending' || value === 'drafting' || value === 'approved' || value === 'shipped') {
    return value;
  }

  return null;
}

function getDuplicatePackagingProposal(error: unknown): SeoPackagingExistingProposalSummary | null {
  if (!(error instanceof ApiError) || error.statusCode !== 409 || !error.details || typeof error.details !== 'object') {
    return null;
  }

  const details = error.details as { existingId?: unknown; existingStatus?: unknown; proposalType?: unknown };
  if (details.proposalType !== 'packaging_fix' || typeof details.existingId !== 'string') {
    return null;
  }

  const status = normalizeExistingPackagingProposalStatus(details.existingStatus);
  if (!status) {
    return null;
  }

  return {
    id: details.existingId,
    status,
    createdAt: '',
  };
}

export default function SeoPackagingPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PackagingFilter>('all');
  const [result, setResult] = useState<SeoPackagingAuditListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<SeoPackagingAuditRecord | null>(null);
  const [pendingProposalAuditId, setPendingProposalAuditId] = useState<string | null>(null);
  const [pendingFixAuditId, setPendingFixAuditId] = useState<string | null>(null);

  const loadPackaging = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listPackagingAudits({
        page: 1,
        limit: 100,
      });
      setResult(nextResult);
      setSelectedAudit((current) =>
        current ? nextResult.data.find((audit) => audit.id === current.id) ?? null : current
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO packaging audits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackaging();
  }, [loadPackaging]);

  const allAudits = useMemo(() => result?.data ?? [], [result]);
  const visibleAudits = useMemo(() => {
    if (filter === 'all') {
      return allAudits;
    }

    return allAudits.filter((audit) => getSeverityLabel(audit) === filter);
  }, [allAudits, filter]);

  const evergreenCount = allAudits.filter((audit) => audit.evergreenRecommendation !== null).length;
  const counts = result?.meta.counts ?? {
    all: 0,
    critical: 0,
    warning: 0,
    info: 0,
  };

  function handleViewExistingPackagingProposal(proposal: SeoPackagingExistingProposalSummary) {
    navigate(`/admin/seo-insights/proposals?status=${getProposalStatusQueryParam(proposal.status)}`);
  }

  function applyExistingPackagingProposal(auditId: string, proposal: SeoPackagingExistingProposalSummary) {
    setResult((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        data: current.data.map((audit) => (
          audit.id === auditId
            ? { ...audit, existingPackagingFixProposal: proposal }
            : audit
        )),
      };
    });
    setSelectedAudit((current) => (
      current && current.id === auditId
        ? { ...current, existingPackagingFixProposal: proposal }
        : current
    ));
  }

  async function handleProposeEvergreen(audit: SeoPackagingAuditRecord) {
    if (!audit.evergreenRecommendation) {
      toast.error('This audit does not have an evergreen routing recommendation');
      return;
    }

    setPendingProposalAuditId(audit.id);
    try {
      const proposal = await seoInsightsApi.proposePackagingEvergreen(audit.id);
      toast.success(
        proposal.proposalType === 'evergreen_routing'
          ? `Evergreen routing proposal queued for ${proposal.targetKeyword}`
          : `Proposal queued for ${proposal.targetKeyword}`
      );
      await loadPackaging();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to queue evergreen routing proposal');
    } finally {
      setPendingProposalAuditId(null);
    }
  }

  async function handleProposeFix(audit: SeoPackagingAuditRecord) {
    if (!hasPackagingFixOpportunity(audit)) {
      toast.error('This audit does not have a manual packaging-fix recommendation');
      return;
    }

    const existingProposal = audit.existingPackagingFixProposal;
    if (existingProposal) {
      toast.error(
        existingProposal.status === 'pending'
          ? `A packaging-fix proposal is already queued for ${audit.pagePath}`
          : `A packaging-fix proposal already exists for ${audit.pagePath}`
      );
      handleViewExistingPackagingProposal(existingProposal);
      return;
    }

    setPendingFixAuditId(audit.id);
    try {
      const proposal = await seoInsightsApi.proposePackagingFix(audit.id);
      toast.success(`Packaging fix proposal queued for ${proposal.targetKeyword}`);
      await loadPackaging();
    } catch (nextError) {
      const duplicateProposal = getDuplicatePackagingProposal(nextError);
      if (duplicateProposal) {
        applyExistingPackagingProposal(audit.id, duplicateProposal);
        toast.error(
          duplicateProposal.status === 'pending'
            ? `A packaging-fix proposal is already queued for ${audit.pagePath}`
            : `A packaging-fix proposal already exists for ${audit.pagePath}`
        );
        handleViewExistingPackagingProposal(duplicateProposal);
        return;
      }

      toast.error(nextError instanceof Error ? nextError.message : 'Failed to queue packaging fix proposal');
    } finally {
      setPendingFixAuditId(null);
    }
  }

  return (
    <div className="space-y-6" data-testid="seo-packaging-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-100">
              <Wrench className="h-3.5 w-3.5" />
              SERP Packaging
            </div>
            <div className="mt-4 flex items-start gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Audit the pages Google already tests, then route demand somewhere stronger.</h1>
              <HelpTooltip
                title="How to use Packaging"
                description="Use this tab when Google already tests a page but the presentation is weak. Queue packaging fixes for title, metadata, breadcrumb, or schema issues, and queue evergreen routing when a news or archive page should hand demand to a stronger canonical destination."
                buttonLabel="How to use SEO Packaging"
                className="mt-1 border-white/15 bg-white/10 text-amber-100 hover:border-white/30 hover:bg-white/15 hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-amber-100"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-amber-100/85">
              Read-only audit of impression-bearing pages for title-link risk, metadata thinness, breadcrumb gaps, and news-to-evergreen routing opportunities.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Pages with issues</p>
              <p className="mt-2 text-lg font-semibold">{counts.all}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Critical pages</p>
              <p className="mt-2 text-lg font-semibold">{counts.critical}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Evergreen routes</p>
              <p className="mt-2 text-lg font-semibold">{evergreenCount}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Packaging backlog</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Window {result?.meta.windowStart ?? 'pending'} to {result?.meta.windowEnd ?? 'pending'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPackaging()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-4">
            <Tabs
              tabs={FILTER_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: counts[tab.id],
              }))}
              activeId={filter}
              onChange={(nextFilter) => {
                startTransition(() => {
                  setFilter(nextFilter as PackagingFilter);
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
              title="Couldn't load SERP packaging audits"
              message={error}
              onRetry={() => void loadPackaging()}
            />
          </div>
        ) : counts.all === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No packaging issues across audited pages"
              description="This is the healthy state: the audited pages currently have no packaging or evergreen-routing issues."
            />
          </div>
        ) : visibleAudits.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<TriangleAlert className="h-6 w-6" />}
              title="No pages in this severity bucket"
              description="Try another filter or refresh after the next finalized Search Console window."
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Primary issue</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Impr.</th>
                    <th className="px-4 py-3">Exp.</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {visibleAudits.map((audit) => {
                    const severity = getSeverityLabel(audit);
                    const primaryIssue = audit.issues[0];
                    const existingPackagingProposal = audit.existingPackagingFixProposal;
                    return (
                      <tr key={audit.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{audit.pagePath}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{audit.title ?? 'Missing title'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{primaryIssue?.label ?? 'No issue title'}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{primaryIssue?.type.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSeverityBadgeClasses(severity)}`}>
                            {severity}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{audit.impressions.toLocaleString()}</td>
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{audit.experimentActive ? 'Active' : '—'}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAudit(audit)}
                              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              View detail
                            </button>
                            {audit.evergreenRecommendation && (
                              <button
                                type="button"
                                onClick={() => void handleProposeEvergreen(audit)}
                                disabled={pendingProposalAuditId === audit.id}
                                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                              >
                                {pendingProposalAuditId === audit.id ? 'Queueing…' : 'Queue routing proposal'}
                              </button>
                            )}
                            {hasPackagingFixOpportunity(audit) && existingPackagingProposal ? (
                              <button
                                type="button"
                                onClick={() => handleViewExistingPackagingProposal(existingPackagingProposal)}
                                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                {getExistingPackagingProposalLabel(existingPackagingProposal)}
                              </button>
                            ) : hasPackagingFixOpportunity(audit) ? (
                              <button
                                type="button"
                                onClick={() => void handleProposeFix(audit)}
                                disabled={pendingFixAuditId === audit.id}
                                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                              >
                                {pendingFixAuditId === audit.id ? 'Queueing…' : 'Queue packaging fix'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <SeoPackagingDrawer
        audit={selectedAudit}
        open={selectedAudit !== null}
        onClose={() => setSelectedAudit(null)}
        onProposeEvergreen={handleProposeEvergreen}
        onProposeFix={handleProposeFix}
        onViewExistingPackagingProposal={handleViewExistingPackagingProposal}
        proposePendingId={pendingProposalAuditId}
        proposeFixPendingId={pendingFixAuditId}
      />
    </div>
  );
}
