import { FileText, RefreshCw, Sparkles } from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { SeoProposalDrawer } from '../../components/admin/SeoProposalDrawer';
import { SeoInsightsSectionNav } from '../../components/admin/SeoInsightsSectionNav';
import { EmptyState, ErrorState, HelpTooltip, LoadingSkeleton, Tabs } from '../../components/ui';
import {
  seoInsightsApi,
  type SeoProposalListResult,
  type SeoProposalRecord,
  type SeoProposalStatusFilter,
} from '../../services/api';

const STATUS_TABS: Array<{ id: Exclude<SeoProposalStatusFilter, 'all'>; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'drafting', label: 'Drafting' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function parseProposalStatusParam(value: string | null): Exclude<SeoProposalStatusFilter, 'all'> {
  if (value === 'drafting' || value === 'approved' || value === 'rejected' || value === 'pending') {
    return value;
  }

  return 'pending';
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function getStatusBadgeClasses(status: SeoProposalRecord['status']): string {
  switch (status) {
    case 'rejected':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'drafting':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'approved':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'shipped':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'pending':
    default:
      return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
  }
}

function getProposalTypeBadgeClasses(type: SeoProposalRecord['proposalType']): string {
  switch (type) {
    case 'evergreen_routing':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'packaging_fix':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
    case 'blog_post':
    default:
      return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
  }
}

function getProposalTypeLabel(type: SeoProposalRecord['proposalType']): string {
  switch (type) {
    case 'evergreen_routing':
      return 'Evergreen routing';
    case 'packaging_fix':
      return 'Packaging fix';
    case 'blog_post':
    default:
      return 'Blog post';
  }
}

function getSourcePageCaption(proposal: SeoProposalRecord): string {
  if (proposal.sourceType === 'keyword_opportunity') {
    return `Planned destination ${proposal.sourcePage}`;
  }

  return proposal.sourcePage;
}

function getApproveLabel(proposal: SeoProposalRecord): string {
  if (proposal.handoff.mode === 'manual_routing_review') {
    return 'Approve routing plan';
  }

  if (proposal.handoff.mode === 'manual_packaging_fix') {
    return 'Approve packaging plan';
  }

  return proposal.handoff.label;
}

function getEmptyStateCopy(status: Exclude<SeoProposalStatusFilter, 'all'>): { title: string; description: string } {
  switch (status) {
    case 'drafting':
      return {
        title: 'No drafting handoffs in progress',
        description: 'Approved blog-draft proposals land here once they are handed off to /AIBlogDraft.',
      };
    case 'approved':
      return {
        title: 'No approved follow-through items yet',
        description: 'Approved routing plans and linked blog drafts will show up here for follow-through.',
      };
    case 'rejected':
      return {
        title: 'No rejected proposals',
        description: 'Rejected briefs stay here as an audit trail when the slop gates catch something.',
      };
    case 'pending':
    default:
      return {
        title: 'No pending proposals',
        description: 'Generate proposals from content gaps, trend signals, or packaging audits to queue them for editorial review.',
      };
  }
}

export default function SeoProposalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SeoProposalListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<SeoProposalRecord | null>(null);
  const [approvePendingId, setApprovePendingId] = useState<string | null>(null);
  const [linkPendingId, setLinkPendingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SeoProposalRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPendingId, setRejectPendingId] = useState<string | null>(null);
  const status = parseProposalStatusParam(searchParams.get('status'));

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await seoInsightsApi.listProposals({
        status,
        page,
        limit: 25,
      });
      setResult(nextResult);
      setSelectedProposal((current) =>
        current ? nextResult.data.find((proposal) => proposal.id === current.id) ?? current : current
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load SEO proposals');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const proposals = result?.data ?? [];
  const counts = result?.meta.counts ?? {
    all: 0,
    pending: 0,
    drafting: 0,
    approved: 0,
    rejected: 0,
    shipped: 0,
  };

  async function handleApprove(proposal: SeoProposalRecord) {
    setApprovePendingId(proposal.id);
    try {
      const response = await seoInsightsApi.approveProposal(proposal.id);
      setSelectedProposal(response.proposal);
      toast.success(
        response.handoff.mode === 'manual_routing_review'
          ? 'Routing plan approved'
          : response.handoff.mode === 'manual_packaging_fix'
            ? 'Packaging plan approved'
            : 'Sent to /AIBlogDraft for drafting'
      );
      await loadProposals();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to approve proposal');
    } finally {
      setApprovePendingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) {
      return;
    }

    if (rejectReason.trim().length === 0) {
      toast.error('Add a rejection reason first');
      return;
    }

    setRejectPendingId(rejectTarget.id);
    try {
      const updated = await seoInsightsApi.rejectProposal(rejectTarget.id, rejectReason);
      setSelectedProposal(updated);
      toast.success('Proposal rejected');
      setRejectTarget(null);
      setRejectReason('');
      await loadProposals();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to reject proposal');
    } finally {
      setRejectPendingId(null);
    }
  }

  async function handleLinkDraft(proposal: SeoProposalRecord, draftPostId: string) {
    setLinkPendingId(proposal.id);
    try {
      const updated = await seoInsightsApi.linkProposalDraft(proposal.id, draftPostId.trim());
      setSelectedProposal(updated);
      toast.success(updated.status === 'shipped' ? 'Linked published post' : 'Draft linked to proposal');
      await loadProposals();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to link draft');
    } finally {
      setLinkPendingId(null);
    }
  }

  const emptyCopy = getEmptyStateCopy(status);

  return (
    <div className="space-y-6" data-testid="seo-proposals-page">
      <header className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-100">
              <FileText className="h-3.5 w-3.5" />
              SEO Proposals
            </div>
            <div className="mt-4 flex items-start gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Turn search gaps into deliberate editorial handoffs.</h1>
              <HelpTooltip
                title="How to use Proposals"
                description="This is the human review queue. Approve strong blog handoffs, approve routing or packaging plans, reject weak ideas with a reason, and link the real blog post after AIBlogDraft creates or publishes it."
                buttonLabel="How to use SEO Proposals"
                className="mt-1 border-white/15 bg-white/10 text-amber-100 hover:border-white/30 hover:bg-white/15 hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-amber-100"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-amber-100/85">
              Queue thesis-shaped blog ideas, evergreen-routing plans, and manual packaging fixes from live search demand, then move each one through the right human-reviewed workflow.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/8 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">All proposals</p>
              <p className="mt-2 text-lg font-semibold">{counts.all}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Pending</p>
              <p className="mt-2 text-lg font-semibold">{counts.pending}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Drafting</p>
              <p className="mt-2 text-lg font-semibold">{counts.drafting}</p>
            </div>
          </div>
        </div>
      </header>

      <SeoInsightsSectionNav activeCount={result?.pagination.total ?? 0} />

      <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Proposal queue</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Pending means the plan exists; drafting means a blog-draft handoff is in flight; approved includes accepted routing plans, packaging plans, and linked drafts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadProposals()}
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
              onChange={(nextTabId) => {
                startTransition(() => {
                  setSearchParams((currentParams) => {
                    const nextParams = new URLSearchParams(currentParams);
                    nextParams.set('status', nextTabId);
                    return nextParams;
                  });
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
              title="Couldn't load SEO proposals"
              message={error}
              onRetry={() => void loadProposals()}
            />
          </div>
        ) : counts.all === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No proposal briefs yet"
              description="Generate a proposal from a content gap, trend signal, evergreen-routing packaging finding, or manual packaging fix, or let the weekly SEO automation create them once that step is enabled."
            />
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:bg-gray-950/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Suggested Angle</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Buttons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-gray-950/60">
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{formatDateTime(proposal.createdAt)}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {(proposal.sourceBucket ?? 'unknown').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{proposal.targetKeyword}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getProposalTypeBadgeClasses(proposal.proposalType)}`}>
                            {getProposalTypeLabel(proposal.proposalType)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{getSourcePageCaption(proposal)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-md text-sm leading-6 text-gray-700 dark:text-gray-300">{proposal.suggestedAngle}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{proposal.confidence.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(proposal.status)}`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProposal(proposal)}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            View detail
                          </button>
                          {proposal.status === 'pending' && (
                            <button
                              type="button"
                              onClick={async () => {
                                setSelectedProposal(proposal);
                                await handleApprove(proposal);
                              }}
                              disabled={approvePendingId === proposal.id}
                              className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {approvePendingId === proposal.id ? 'Sending…' : getApproveLabel(proposal)}
                            </button>
                          )}
                          {proposal.status !== 'rejected' && proposal.status !== 'shipped' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectTarget(proposal);
                                setRejectReason(proposal.rejectedReason ?? '');
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/30"
                            >
                              Reject
                            </button>
                          )}
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

      <SeoProposalDrawer
        proposal={selectedProposal}
        open={selectedProposal !== null}
        onClose={() => setSelectedProposal(null)}
        onApprove={handleApprove}
        onRejectRequest={(proposal) => {
          setRejectTarget(proposal);
          setRejectReason(proposal.rejectedReason ?? '');
        }}
        onLinkDraft={handleLinkDraft}
        approvePendingId={approvePendingId}
        linkPendingId={linkPendingId}
      />

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          data-testid="reject-proposal-dialog"
          onClick={(event) => {
            if (event.target === event.currentTarget && !rejectPendingId) {
              setRejectTarget(null);
              setRejectReason('');
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reject proposal</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This stays in the audit trail. Add the reason so the next operator can see why the brief was blocked.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="mt-4 min-h-[120px] w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-rose-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="Explain why this brief should not move forward."
              data-testid="reject-reason-input"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                disabled={rejectPendingId === rejectTarget.id}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={rejectPendingId === rejectTarget.id}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejectPendingId === rejectTarget.id ? 'Rejecting…' : 'Reject proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
