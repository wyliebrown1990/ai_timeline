import type { JSX } from 'react';
import type { SeoProposalRecord } from '../services/api';

function getProposalBasePath(proposal: SeoProposalRecord): string {
  return proposal.handoff?.proposalPath ?? '/admin/seo-insights/proposals';
}

export function getRejectedProposalPath(proposal: SeoProposalRecord): string {
  const basePath = getProposalBasePath(proposal);
  return basePath.includes('?') ? `${basePath}&status=rejected` : `${basePath}?status=rejected`;
}

export function getProposalToastContent(proposal: SeoProposalRecord): JSX.Element {
  if (proposal.status === 'rejected') {
    return (
      <span>
        Proposal for <span className="font-semibold">{proposal.targetKeyword}</span> was auto-rejected by the
        slop guard.{' '}
        <a href={getRejectedProposalPath(proposal)} className="underline">
          Open rejected proposals
        </a>
      </span>
    );
  }

  return (
    <span>
      Proposal queued for <span className="font-semibold">{proposal.targetKeyword}</span>.{' '}
      <a href={getProposalBasePath(proposal)} className="underline">
        Open proposals
      </a>
    </span>
  );
}

export function getProposalToastTone(proposal: SeoProposalRecord): 'success' | 'error' {
  return proposal.status === 'rejected' ? 'error' : 'success';
}
