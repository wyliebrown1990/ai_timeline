import { Copy, ExternalLink, Link2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { SeoProposalRecord } from '../../services/api';
import { Drawer, HelpTooltip } from '../ui';

interface SeoProposalDrawerProps {
  proposal: SeoProposalRecord | null;
  open: boolean;
  onClose: () => void;
  onApprove: (proposal: SeoProposalRecord) => Promise<void>;
  onRejectRequest: (proposal: SeoProposalRecord) => void;
  onLinkDraft: (proposal: SeoProposalRecord, draftPostId: string) => Promise<void>;
  approvePendingId: string | null;
  linkPendingId: string | null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function formatSourceLabel(proposal: SeoProposalRecord): string {
  if (proposal.sourceType === 'cluster_snapshot') {
    return proposal.sourceWindowEnd
      ? `${proposal.sourceWindowStart} to ${proposal.sourceWindowEnd}`
      : proposal.sourceWindowStart;
  }

  return proposal.sourceWindowStart;
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

function getIssueSeverityClasses(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
    case 'info':
    default:
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300';
  }
}

function getSourcePageLabel(proposal: SeoProposalRecord): string {
  return proposal.sourceType === 'keyword_opportunity' ? 'Planned destination' : 'Source page';
}

function getSourcePageHelp(proposal: SeoProposalRecord): string | null {
  if (proposal.sourceType !== 'keyword_opportunity') {
    return null;
  }

  return 'This is the intended public URL if /AIBlogDraft creates the post. It does not mean a blog draft already exists yet.';
}

function getLinkDraftHelp(proposal: SeoProposalRecord): string {
  if (proposal.sourceType === 'keyword_opportunity') {
    return 'After /AIBlogDraft creates the post in Blog CMS, paste the blog post ID, slug, public /blog/... URL, or /admin/blog/.../edit URL here. Planned destinations like /blog/chip-gaines do not count until a real post exists.';
  }

  return 'After you run /AIBlogDraft, paste the resulting blog post ID, slug, public /blog/... URL, or /admin/blog/.../edit URL here to connect the proposal to the draft. Published posts will move to shipped automatically when linked.';
}

async function copyCommand(command: string) {
  if (!navigator.clipboard) {
    throw new Error('Clipboard is not available in this browser');
  }

  await navigator.clipboard.writeText(command);
}

export function SeoProposalDrawer({
  proposal,
  open,
  onClose,
  onApprove,
  onRejectRequest,
  onLinkDraft,
  approvePendingId,
  linkPendingId,
}: SeoProposalDrawerProps) {
  const [draftPostId, setDraftPostId] = useState('');

  useEffect(() => {
    setDraftPostId(proposal?.draftPost?.id ?? '');
  }, [proposal?.draftPost?.id, proposal?.id]);

  if (!proposal) {
    return null;
  }

  const canApprove = proposal.status === 'pending';
  const canReject = proposal.status !== 'rejected' && proposal.status !== 'shipped';
  const usesBlogDraftFlow = proposal.handoff.mode === 'blog_draft';
  const canLinkDraft = usesBlogDraftFlow && (proposal.status === 'drafting' || proposal.status === 'approved');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={proposal.targetKeyword}
      description="Human-reviewed follow-through plan for the proposal lane."
    >
      <div className="space-y-5 p-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(proposal.status)}`}>
              {proposal.status}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProposalTypeBadgeClasses(proposal.proposalType)}`}>
              {getProposalTypeLabel(proposal.proposalType)}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Confidence {proposal.confidence.toFixed(2)}
            </span>
            {proposal.sourceBucket && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                {proposal.sourceBucket.replace('_', ' ')}
              </span>
            )}
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">{proposal.suggestedAngle}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{proposal.rationale}</p>
          {proposal.hypothesis && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hypothesis</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{proposal.hypothesis}</p>
            </div>
          )}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Source window</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatSourceLabel(proposal)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Created</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatDateTime(proposal.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">{getSourcePageLabel(proposal)}</dt>
              <dd className="mt-1 break-all font-medium text-slate-900 dark:text-white">{proposal.sourcePage}</dd>
              {getSourcePageHelp(proposal) && (
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {getSourcePageHelp(proposal)}
                </p>
              )}
            </div>
            {proposal.sourceQuery && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500 dark:text-slate-400">Visible query</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{proposal.sourceQuery}</dd>
              </div>
            )}
          </dl>
        </section>

        {proposal.routingPlan && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Routing plan</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">{proposal.routingPlan.rationale}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">Current destination</p>
                <p className="mt-2 text-sm font-semibold text-rose-900 dark:text-rose-100">{proposal.routingPlan.currentPath}</p>
                <p className="mt-2 text-sm text-rose-900/80 dark:text-rose-100/80">
                  {proposal.routingPlan.representativeQuery
                    ? `Representative query: ${proposal.routingPlan.representativeQuery}`
                    : 'Recurring demand is landing on a weaker destination today.'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4 dark:border-emerald-900/40 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Recommended destination</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{proposal.routingPlan.targetPath}</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {proposal.routingPlan.targetLabel} · {proposal.routingPlan.moveType.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </section>
        )}

        {proposal.packagingFixPlan && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Packaging fix plan</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 dark:border-amber-900/40 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Current page</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{proposal.packagingFixPlan.pagePath}</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{proposal.packagingFixPlan.title ?? 'Missing title'}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {proposal.packagingFixPlan.pageType.replace(/_/g, ' ')} · canonical {proposal.packagingFixPlan.canonicalPath ?? 'missing'}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 dark:border-amber-900/40 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Planned fixes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {proposal.packagingFixPlan.issueTypes.map((issueType) => (
                    <span
                      key={issueType}
                      className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                    >
                      {issueType.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {proposal.packagingFixPlan.structuredDataTypes.length > 0 ? proposal.packagingFixPlan.structuredDataTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {type}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">No structured data types captured for this route.</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {proposal.packagingFixPlan.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-amber-200 bg-white/90 p-4 dark:border-amber-900/40 dark:bg-slate-950/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getIssueSeverityClasses(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      {issue.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{issue.label}</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{issue.details}</p>
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    <span className="font-semibold">Recommended fix:</span> {issue.recommendedFix}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {proposal.topicPod && (
          <details
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
            open={proposal.sourceType === 'cluster_snapshot'}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-amber-900 dark:text-amber-100">
              Topic Pod Plan
            </summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
                  {proposal.topicPod.moveType.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                  {proposal.topicPod.sourceLabel}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800/70 dark:text-amber-200/70">Canonical destination</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{proposal.topicPod.canonicalDestination.path}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{proposal.topicPod.canonicalDestination.reason}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800/70 dark:text-amber-200/70">Companion assets</p>
                <div className="mt-3 space-y-2">
                  {proposal.topicPod.companionAssets.map((asset) => (
                    <div key={`${asset.type}:${asset.label}`} className="rounded-2xl border border-amber-200/70 bg-white/80 p-3 dark:border-amber-900/30 dark:bg-slate-900/70">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{asset.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">{asset.status}</p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{asset.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
              {proposal.topicPod.internalLinkOpportunities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800/70 dark:text-amber-200/70">Internal-link opportunities</p>
                  <div className="mt-3 space-y-2">
                    {proposal.topicPod.internalLinkOpportunities.map((item) => (
                      <div key={`${item.entityType}:${item.path}`} className="rounded-2xl border border-amber-200/70 bg-white/80 p-3 dark:border-amber-900/30 dark:bg-slate-900/70">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.path}</p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}

        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-violet-900 dark:text-violet-100">
                <Sparkles className="h-4 w-4" />
                {proposal.handoff.label}
              </div>
              <p className="mt-2 text-sm leading-6 text-violet-900/80 dark:text-violet-100/80">
                {proposal.handoff.guidance}
              </p>
            </div>
            {proposal.handoff.command && (
              <button
                type="button"
                onClick={() => {
                  void copyCommand(proposal.handoff.command ?? '')
                    .then(() => toast.success('Copied /AIBlogDraft command'))
                    .catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : 'Failed to copy command');
                    });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-slate-950 dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy command
              </button>
            )}
          </div>
          {proposal.handoff.command && (
            <div className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <code className="break-words text-xs leading-6 text-slate-900 dark:text-slate-100">{proposal.handoff.command}</code>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {canApprove && (
              <button
                type="button"
                onClick={() => void onApprove(proposal)}
                disabled={approvePendingId === proposal.id}
                className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {approvePendingId === proposal.id
                  ? 'Sending…'
                  : proposal.handoff.mode === 'manual_routing_review'
                    ? 'Approve routing plan'
                    : proposal.handoff.mode === 'manual_packaging_fix'
                      ? 'Approve packaging plan'
                    : 'Send to /AIBlogDraft for drafting'}
              </button>
            )}
            {canReject && (
              <button
                type="button"
                onClick={() => onRejectRequest(proposal)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                Reject proposal
              </button>
            )}
            <a
              href={proposal.handoff.proposalPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <ExternalLink className="h-4 w-4" />
              Open proposals page
            </a>
          </div>
        </section>

        {canLinkDraft && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              <Link2 className="h-4 w-4" />
              Link created draft
              <HelpTooltip
                title="Linking a draft"
                description="Paste the real post ID, slug, public /blog/... URL, or /admin/blog/.../edit URL after AIBlogDraft creates the post in Blog CMS. Linking the real post moves the proposal forward and creates its experiment row."
                buttonLabel="Explain how to link a created draft"
                className="h-5 w-5 border-blue-200 bg-white/80 text-blue-500 shadow-none hover:border-blue-300 hover:bg-white dark:border-blue-800 dark:bg-slate-950 dark:text-blue-300"
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-blue-900/80 dark:text-blue-100/80">
              {getLinkDraftHelp(proposal)}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={draftPostId}
                onChange={(event) => setDraftPostId(event.target.value)}
                placeholder="post ID, slug, /blog/... URL, or /admin/blog/.../edit"
                data-testid="proposal-draft-post-id"
                className="flex-1 rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-blue-900/50 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void onLinkDraft(proposal, draftPostId)}
                disabled={linkPendingId === proposal.id || draftPostId.trim().length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {linkPendingId === proposal.id ? 'Linking…' : 'Link draft'}
              </button>
            </div>
            <div className="mt-3">
              <a
                href="/admin/blog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-800 underline-offset-4 hover:underline dark:text-blue-200"
              >
                <ExternalLink className="h-4 w-4" />
                Open Blog CMS
              </a>
            </div>
          </section>
        )}

        {proposal.draftPost && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Linked draft</p>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">{proposal.draftPost.title}</p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              {proposal.draftPost.status} · {proposal.draftPost.slug}
            </p>
          </section>
        )}

        {proposal.rejectedReason && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
            <p className="text-sm font-medium text-rose-900 dark:text-rose-100">Rejected reason</p>
            <p className="mt-2 text-sm leading-6 text-rose-900/80 dark:text-rose-100/80">{proposal.rejectedReason}</p>
          </section>
        )}

        <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white">
            Link inventory ({proposal.linkInventory.length})
          </summary>
          <div className="mt-4 space-y-3">
            {proposal.linkInventory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No graph matches were bundled into this brief yet.</p>
            ) : (
              proposal.linkInventory.map((item) => (
                <div key={`${item.entityType}:${item.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.entityType}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.reason}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.path}</p>
                </div>
              ))
            )}
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white">
            News hooks ({proposal.newsHooks.length})
          </summary>
          <div className="mt-4 space-y-3">
            {proposal.newsHooks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent article hooks were bundled into this proposal.</p>
            ) : (
              proposal.newsHooks.map((item) => (
                <div key={item.articleId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.sourceName ?? 'Unknown source'} · {formatDateTime(item.publishedAt)}
                  </p>
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open source
                  </a>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    </Drawer>
  );
}

export default SeoProposalDrawer;
