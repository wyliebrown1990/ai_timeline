import { createHash } from 'crypto';
import { appendFile, readdir, readFile } from 'fs/promises';
import path from 'path';
import { getGscHealth } from '../gsc/gscIngest';
import { listInsights, type BucketInsight, type InsightBucket } from '../gsc/bucketClassifier';
import { ApiError } from '../../middleware/error';
import { isPaused } from './agentControl';
import {
  getLatestAgentRunStatus,
  setLatestAgentRunStatus,
  type SeoAgentRunSerperSnapshot,
} from './agentRunStatus';
import { getSerperUsageSummary, type SerperUsageSummary } from './serperClient';
import { listPendingFeedbackActions, measureSeoAction } from './feedbackMeasurement';
import { shipRewrite } from './metadataRewriter';
import {
  generateEvergreenRoutingProposal,
  generatePackagingFixProposal,
  generateProposal,
  generateProposalFromKeywordOpportunity,
} from './briefGenerator';
import { listSeoPackagingAudits, type SeoPackagingAuditRecord } from './serpPackagingAudit';
import {
  listKeywordOpportunities,
  markKeywordOpportunityPromoted,
  type KeywordOpportunityRecord,
} from './keywordDiscovery';

const DIGEST_URL = 'https://letaiexplainai.com/admin/seo-insights';
const AUTO_SHIP_WEEKLY_CAP = 3;
const KEYWORD_PROMOTION_CAP = 2;
const INSIGHT_BUCKETS: InsightBucket[] = ['winnable_loss', 'content_gap', 'trend_signal', 'decay'];
const REPO_ROOT = process.cwd();

export interface SeoWeeklyDigestRunOptions {
  force?: boolean;
  dryRun?: boolean;
  now?: Date;
}

export interface SeoWeeklyDigestDecision {
  sourceType: 'insight' | 'packaging' | 'keyword' | 'measurement';
  id: string;
  lane: 'auto_ship' | 'propose' | 'human_only' | 'measured';
  status: 'planned' | 'shipped' | 'proposed' | 'measured' | 'skipped' | 'already_queued' | 'failed';
  label: string;
  rationale: string;
}

export interface SeoWeeklyDigestRunSummary {
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  weekStart: string | null;
  dryRun: boolean;
  paused: boolean;
  alreadyCompleted: boolean;
  shippedCount: number;
  proposalCount: number;
  humanOnlyCount: number;
  measuredCount: number;
  digestUrl: string;
  errorMessage: string | null;
  serper: SerperUsageSummary | null;
  contextFiles: Array<{
    path: string;
    sha256: string;
  }>;
  decisions: SeoWeeklyDigestDecision[];
}

type ProposalKind = 'content' | 'packaging_evergreen' | 'packaging_fix' | 'keyword';

interface ProposalCandidate {
  id: string;
  kind: ProposalKind;
  label: string;
  rationale: string;
  promoteAfterProposal?: boolean;
}

function toIso(value: Date): string {
  return value.toISOString();
}

function normalizeWeekStart(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 409;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isPromotableKeyword(row: KeywordOpportunityRecord): boolean {
  return (
    row.status === 'scored' &&
    row.pageTypeRecommendation === 'blog_post' &&
    row.overallScore >= 60 &&
    (row.sourceType === 'gsc_cluster' || row.sourceType === 'google_trends' || row.sourceType === 'serp_sample')
  );
}

function buildSerperSnapshot(
  serper: SerperUsageSummary,
  capturedAt: string,
): SeoAgentRunSerperSnapshot {
  return {
    capturedAt,
    configured: serper.configured,
    enabled: serper.enabled,
    autoTopupEnabled: serper.autoTopupEnabled,
    creditsUsedWeek: serper.creditsUsedWeek,
    creditsUsedMonth: serper.creditsUsedMonth,
    effectiveSpendWeekUsd: serper.effectiveSpendWeekUsd,
    effectiveSpendMonthUsd: serper.effectiveSpendMonthUsd,
    remainingCredits: serper.remainingCredits,
    remainingCreditsSource: serper.remainingCreditsSource,
    remainingCreditsObservedAt: serper.remainingCreditsObservedAt,
    projectedDepletionDate: serper.projectedDepletionDate,
    lastSampledAt: serper.lastSampledAt,
    warningLevel: serper.warningLevel,
  };
}

async function hashFile(relativePath: string): Promise<{ path: string; sha256: string } | null> {
  try {
    const content = await readFile(path.join(REPO_ROOT, relativePath));
    return {
      path: relativePath,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
  } catch {
    return null;
  }
}

async function getLatestDryRunNotePath(): Promise<string | null> {
  const skillDir = path.join(REPO_ROOT, '.claude/skills/SEOAuditAgent');
  try {
    const filenames = await readdir(skillDir);
    const latest = filenames
      .filter((filename) => /^dry-run-.*\.md$/.test(filename))
      .sort()
      .at(-1);
    return latest ? `.claude/skills/SEOAuditAgent/${latest}` : null;
  } catch {
    return null;
  }
}

async function hashContextFiles(): Promise<SeoWeeklyDigestRunSummary['contextFiles']> {
  const latestDryRun = await getLatestDryRunNotePath();
  const paths = [
    '.claude/skills/SEOAuditAgent/SKILL.md',
    '.claude/skills/SEOAuditAgent/Workflows/Digest.md',
    '.claude/skills/SEOAuditAgent/seo_voice.md',
    latestDryRun,
    '.claude/skills/SEOAuditAgent/slop_categories.md',
    '.claude/skills/SEOAuditAgent/bucket_playbooks/content-gaps.md',
    '.claude/skills/SEOAuditAgent/bucket_playbooks/decay.md',
    '.claude/skills/SEOAuditAgent/bucket_playbooks/serp-packaging.md',
    '.claude/skills/SEOAuditAgent/bucket_playbooks/trend-signals.md',
    '.claude/skills/SEOAuditAgent/bucket_playbooks/winnable-losses.md',
  ].filter((value): value is string => Boolean(value));

  const hashes = await Promise.all(paths.map(hashFile));
  return hashes.filter((value): value is { path: string; sha256: string } => value !== null);
}

async function loadWeeklyInsights(weekStart: string): Promise<BucketInsight[]> {
  const results = await Promise.all(
    INSIGHT_BUCKETS.map((bucket) => listInsights({
      bucket,
      weekStart,
      page: 1,
      limit: 50,
    })),
  );

  return results.flatMap((result) => result.data);
}

function collectInsightCandidates(insights: BucketInsight[]): {
  autoShip: BucketInsight[];
  proposals: ProposalCandidate[];
  humanOnly: SeoWeeklyDigestDecision[];
} {
  const autoShip: BucketInsight[] = [];
  const proposals: ProposalCandidate[] = [];
  const humanOnly: SeoWeeklyDigestDecision[] = [];

  for (const insight of insights) {
    if (insight.status === 'dismissed' || insight.status === 'shipped') {
      continue;
    }

    const label = `${insight.bucket}: ${insight.query ?? 'page aggregate'} -> ${insight.page}`;
    if (
      insight.bucket === 'winnable_loss' &&
      insight.page.includes('/blog/') &&
      insight.currentMetrics.impressions >= 100 &&
      insight.score >= 80
    ) {
      autoShip.push(insight);
      continue;
    }

    if ((insight.bucket === 'content_gap' || insight.bucket === 'trend_signal') && insight.score >= 60) {
      proposals.push({
        id: insight.id,
        kind: 'content',
        label,
        rationale: insight.suggestedAction,
      });
      continue;
    }

    humanOnly.push({
      sourceType: 'insight',
      id: insight.id,
      lane: 'human_only',
      status: 'skipped',
      label,
      rationale: insight.suggestedAction || 'Insight did not qualify for auto-ship or proposal lanes.',
    });
  }

  return { autoShip, proposals, humanOnly };
}

function collectPackagingCandidates(audits: SeoPackagingAuditRecord[]): {
  proposals: ProposalCandidate[];
  humanOnly: SeoWeeklyDigestDecision[];
} {
  const proposals: ProposalCandidate[] = [];
  const humanOnly: SeoWeeklyDigestDecision[] = [];

  for (const audit of audits) {
    const label = `${audit.pagePath} (${audit.issueTypes.join(', ') || 'no issues'})`;
    if (audit.existingPackagingFixProposal) {
      humanOnly.push({
        sourceType: 'packaging',
        id: audit.id,
        lane: 'human_only',
        status: 'already_queued',
        label,
        rationale: `Existing packaging proposal ${audit.existingPackagingFixProposal.id} is already ${audit.existingPackagingFixProposal.status}.`,
      });
      continue;
    }

    if (audit.evergreenRecommendation) {
      proposals.push({
        id: audit.evergreenRecommendation.clusterId,
        kind: 'packaging_evergreen',
        label,
        rationale: audit.evergreenRecommendation.rationale,
      });
      continue;
    }

    if (audit.issues.length > 0 && audit.issues.some((issue) => issue.type !== 'evergreen_routing')) {
      proposals.push({
        id: audit.id,
        kind: 'packaging_fix',
        label,
        rationale: 'Current page is the right destination, but SERP packaging is weak.',
      });
      continue;
    }

    humanOnly.push({
      sourceType: 'packaging',
      id: audit.id,
      lane: 'human_only',
      status: 'skipped',
      label,
      rationale: 'Packaging audit did not have a clear evergreen or packaging-fix action.',
    });
  }

  return { proposals, humanOnly };
}

function collectKeywordCandidates(rows: KeywordOpportunityRecord[]): {
  proposals: ProposalCandidate[];
  humanOnly: SeoWeeklyDigestDecision[];
} {
  const proposals: ProposalCandidate[] = [];
  const humanOnly: SeoWeeklyDigestDecision[] = [];

  for (const row of rows) {
    const label = `${row.seedQuery} (${row.sourceType}, score ${row.overallScore})`;
    if (isPromotableKeyword(row)) {
      if (proposals.length < KEYWORD_PROMOTION_CAP) {
        proposals.push({
          id: row.id,
          kind: 'keyword',
          label,
          rationale: row.rationale,
          promoteAfterProposal: true,
        });
      } else {
        humanOnly.push({
          sourceType: 'keyword',
          id: row.id,
          lane: 'human_only',
          status: 'skipped',
          label,
          rationale: 'Eligible keyword deferred because the weekly keyword-promotion cap was reached.',
        });
      }
      continue;
    }

    humanOnly.push({
      sourceType: 'keyword',
      id: row.id,
      lane: 'human_only',
      status: 'skipped',
      label,
      rationale: row.sourceType === 'editorial_seed'
        ? 'Editorial seed rows remain in backlog for human review.'
        : 'Keyword row did not meet source, page-type, status, or score requirements.',
    });
  }

  return { proposals, humanOnly };
}

async function executeProposal(candidate: ProposalCandidate): Promise<void> {
  if (candidate.kind === 'content') {
    await generateProposal(candidate.id);
  } else if (candidate.kind === 'packaging_evergreen') {
    await generateEvergreenRoutingProposal(candidate.id);
  } else if (candidate.kind === 'packaging_fix') {
    await generatePackagingFixProposal(candidate.id);
  } else {
    const proposal = await generateProposalFromKeywordOpportunity(candidate.id);
    if (proposal.status !== 'rejected' && candidate.promoteAfterProposal) {
      await markKeywordOpportunityPromoted(candidate.id);
    }
  }
}

async function runMeasuredActions(
  now: Date,
  dryRun: boolean,
  paused: boolean,
): Promise<{ measuredCount: number; decisions: SeoWeeklyDigestDecision[] }> {
  const pending = await listPendingFeedbackActions(now);
  const decisions: SeoWeeklyDigestDecision[] = [];
  let measuredCount = 0;

  for (const action of pending) {
    const label = `${action.targetType}: ${action.pageUrl}`;
    if (paused) {
      decisions.push({
        sourceType: 'measurement',
        id: action.id,
        lane: 'measured',
        status: 'skipped',
        label,
        rationale: 'SEO agent is paused; measurement mutation suppressed.',
      });
      continue;
    }

    if (dryRun) {
      decisions.push({
        sourceType: 'measurement',
        id: action.id,
        lane: 'measured',
        status: 'planned',
        label,
        rationale: `Measurement eligible for ${action.beforeStart}..${action.afterEnd}.`,
      });
      continue;
    }

    try {
      await measureSeoAction(action.id, now);
      measuredCount += 1;
      decisions.push({
        sourceType: 'measurement',
        id: action.id,
        lane: 'measured',
        status: 'measured',
        label,
        rationale: 'Feedback measurement stored.',
      });
    } catch (error) {
      decisions.push({
        sourceType: 'measurement',
        id: action.id,
        lane: 'measured',
        status: isConflict(error) ? 'skipped' : 'failed',
        label,
        rationale: getErrorMessage(error),
      });
      if (!isConflict(error)) {
        throw error;
      }
    }
  }

  return { measuredCount, decisions };
}

async function executeAutoShip(
  insights: BucketInsight[],
  paused: boolean,
  dryRun: boolean,
): Promise<{ shippedCount: number; decisions: SeoWeeklyDigestDecision[] }> {
  const decisions: SeoWeeklyDigestDecision[] = [];
  let shippedCount = 0;

  for (const insight of insights.slice(0, AUTO_SHIP_WEEKLY_CAP)) {
    const label = `${insight.query ?? 'page aggregate'} -> ${insight.page}`;
    if (paused) {
      decisions.push({
        sourceType: 'insight',
        id: insight.id,
        lane: 'auto_ship',
        status: 'skipped',
        label,
        rationale: 'SEO agent is paused; auto-ship suppressed.',
      });
      continue;
    }

    if (dryRun) {
      decisions.push({
        sourceType: 'insight',
        id: insight.id,
        lane: 'auto_ship',
        status: 'planned',
        label,
        rationale: insight.suggestedAction,
      });
      continue;
    }

    try {
      await shipRewrite(insight.id, false);
      shippedCount += 1;
      decisions.push({
        sourceType: 'insight',
        id: insight.id,
        lane: 'auto_ship',
        status: 'shipped',
        label,
        rationale: insight.suggestedAction,
      });
    } catch (error) {
      decisions.push({
        sourceType: 'insight',
        id: insight.id,
        lane: 'auto_ship',
        status: isConflict(error) ? 'skipped' : 'failed',
        label,
        rationale: getErrorMessage(error),
      });
      if (!isConflict(error)) {
        throw error;
      }
    }
  }

  return { shippedCount, decisions };
}

async function executeProposals(
  candidates: ProposalCandidate[],
  paused: boolean,
  dryRun: boolean,
): Promise<{ proposalCount: number; decisions: SeoWeeklyDigestDecision[] }> {
  const decisions: SeoWeeklyDigestDecision[] = [];
  let proposalCount = 0;

  for (const candidate of candidates) {
    const sourceType: SeoWeeklyDigestDecision['sourceType'] = candidate.kind === 'keyword'
      ? 'keyword'
      : candidate.kind === 'content'
        ? 'insight'
        : 'packaging';

    if (paused) {
      decisions.push({
        sourceType,
        id: candidate.id,
        lane: 'propose',
        status: 'skipped',
        label: candidate.label,
        rationale: 'SEO agent is paused; proposal mutation suppressed.',
      });
      continue;
    }

    if (dryRun) {
      decisions.push({
        sourceType,
        id: candidate.id,
        lane: 'propose',
        status: 'planned',
        label: candidate.label,
        rationale: candidate.rationale,
      });
      continue;
    }

    try {
      await executeProposal(candidate);
      proposalCount += 1;
      decisions.push({
        sourceType,
        id: candidate.id,
        lane: 'propose',
        status: 'proposed',
        label: candidate.label,
        rationale: candidate.rationale,
      });
    } catch (error) {
      decisions.push({
        sourceType,
        id: candidate.id,
        lane: 'propose',
        status: isConflict(error) ? 'already_queued' : 'failed',
        label: candidate.label,
        rationale: getErrorMessage(error),
      });
      if (!isConflict(error)) {
        throw error;
      }
    }
  }

  return { proposalCount, decisions };
}

async function persistRunStatus(summary: SeoWeeklyDigestRunSummary): Promise<void> {
  if (summary.dryRun || summary.status === 'skipped') {
    return;
  }

  await setLatestAgentRunStatus({
    status: summary.status === 'failed' ? 'failed' : 'success',
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    weekStart: summary.weekStart ? `${summary.weekStart}T00:00:00.000Z` : null,
    shippedCount: summary.shippedCount,
    proposalCount: summary.proposalCount,
    humanOnlyCount: summary.humanOnlyCount,
    measuredCount: summary.measuredCount,
    digestUrl: summary.digestUrl,
    errorMessage: summary.errorMessage,
    serperSnapshot: summary.serper ? buildSerperSnapshot(summary.serper, summary.completedAt) : null,
  });
}

function getTargetPath(label: string): string {
  const candidate = label.includes('->') ? label.split('->').at(-1)?.trim() : label;
  if (!candidate) {
    return 'unknown';
  }

  try {
    return new URL(candidate).pathname || '/';
  } catch {
    return candidate;
  }
}

function buildSeoVoiceBlock(summary: SeoWeeklyDigestRunSummary, decision: SeoWeeklyDigestDecision): string {
  const runDate = summary.completedAt.slice(0, 10);
  const targetPath = getTargetPath(decision.label);
  const action = decision.status === 'shipped' ? 'metadata_rewrite' : 'measured_regression';
  const result = decision.status === 'shipped' ? 'kept' : 'needs review';

  return [
    '',
    `## ${runDate} — \`${decision.id}\` (\`${decision.lane}\` on \`${targetPath}\`)`,
    '',
    '### Outcome',
    `- Week reviewed: \`${summary.weekStart ?? 'unknown'}\``,
    '- Query: `page_aggregate`',
    `- Action: \`${action}\``,
    '- Confidence: `0.00`',
    `- Result: \`${result}\``,
    '',
    '### Keep',
    `- ${decision.rationale || 'Record the outcome for future digest calibration.'}`,
    '',
    '### Avoid',
    '- Do not generalize this outcome beyond similarly scoped SEO actions.',
    '',
    '### Next Time',
    '- Re-check measured results before broadening the automation lane.',
    '',
  ].join('\n');
}

async function appendSeoVoiceEntries(summary: SeoWeeklyDigestRunSummary): Promise<void> {
  const appendable = summary.decisions.filter((decision) => (
    decision.status === 'shipped' || decision.status === 'measured'
  ));

  if (appendable.length === 0) {
    return;
  }

  const content = appendable.map((decision) => buildSeoVoiceBlock(summary, decision)).join('');

  try {
    await appendFile(path.join(REPO_ROOT, '.claude/skills/SEOAuditAgent/seo_voice.md'), content);
  } catch (error) {
    console.warn(`[SEO Weekly Digest] Unable to append seo_voice.md entries: ${getErrorMessage(error)}`);
  }
}

export async function runSeoWeeklyDigest(
  options: SeoWeeklyDigestRunOptions = {},
): Promise<SeoWeeklyDigestRunSummary> {
  const now = options.now ?? new Date();
  const startedAt = toIso(now);
  const dryRun = options.dryRun ?? false;
  const contextFiles = await hashContextFiles();
  let weekStart: string | null = null;
  let serper: SerperUsageSummary | null = null;
  let paused = false;

  try {
    const [health, pausedState, agentRun, serperSummary] = await Promise.all([
      getGscHealth(now),
      isPaused(),
      getLatestAgentRunStatus(),
      getSerperUsageSummary(now),
    ]);
    weekStart = normalizeWeekStart(health.lastWeekCovered);
    serper = serperSummary;
    paused = pausedState;

    if (!weekStart) {
      throw new Error('Missing finalized GSC week; weekly digest cannot run.');
    }

    if (
      !dryRun &&
      !options.force &&
      agentRun?.status === 'success' &&
      normalizeWeekStart(agentRun.weekStart) === weekStart
    ) {
      return {
        status: 'skipped',
        startedAt,
        completedAt: toIso(options.now ?? new Date()),
        weekStart,
        dryRun,
        paused,
        alreadyCompleted: true,
        shippedCount: 0,
        proposalCount: 0,
        humanOnlyCount: 0,
        measuredCount: 0,
        digestUrl: DIGEST_URL,
        errorMessage: null,
        serper,
        contextFiles,
        decisions: [],
      };
    }

    const [measurementResult, insights, packaging, keywords] = await Promise.all([
      runMeasuredActions(now, dryRun, paused),
      loadWeeklyInsights(weekStart),
      listSeoPackagingAudits({ page: 1, limit: 100 }),
      listKeywordOpportunities({ status: 'scored', page: 1, limit: 25 }),
    ]);

    const insightCandidates = collectInsightCandidates(insights);
    const packagingCandidates = collectPackagingCandidates(packaging.data);
    const keywordCandidates = collectKeywordCandidates(keywords.data);
    const autoShipResult = await executeAutoShip(insightCandidates.autoShip, paused, dryRun);
    const proposalResult = await executeProposals(
      [
        ...insightCandidates.proposals,
        ...packagingCandidates.proposals,
        ...keywordCandidates.proposals,
      ],
      paused,
      dryRun,
    );
    const humanOnly = [
      ...insightCandidates.humanOnly,
      ...packagingCandidates.humanOnly,
      ...keywordCandidates.humanOnly,
    ];

    const summary: SeoWeeklyDigestRunSummary = {
      status: 'success',
      startedAt,
      completedAt: toIso(options.now ?? new Date()),
      weekStart,
      dryRun,
      paused,
      alreadyCompleted: false,
      shippedCount: autoShipResult.shippedCount,
      proposalCount: proposalResult.proposalCount,
      humanOnlyCount: humanOnly.length,
      measuredCount: measurementResult.measuredCount,
      digestUrl: DIGEST_URL,
      errorMessage: null,
      serper,
      contextFiles,
      decisions: [
        ...measurementResult.decisions,
        ...autoShipResult.decisions,
        ...proposalResult.decisions,
        ...humanOnly,
      ],
    };

    await appendSeoVoiceEntries(summary);
    await persistRunStatus(summary);
    return summary;
  } catch (error) {
    const summary: SeoWeeklyDigestRunSummary = {
      status: 'failed',
      startedAt,
      completedAt: toIso(options.now ?? new Date()),
      weekStart,
      dryRun,
      paused,
      alreadyCompleted: false,
      shippedCount: 0,
      proposalCount: 0,
      humanOnlyCount: 0,
      measuredCount: 0,
      digestUrl: DIGEST_URL,
      errorMessage: getErrorMessage(error),
      serper,
      contextFiles,
      decisions: [],
    };
    await persistRunStatus(summary);
    throw error;
  }
}

export const weeklyDigestRunnerTestInternals = {
  collectInsightCandidates,
  collectKeywordCandidates,
  collectPackagingCandidates,
  isPromotableKeyword,
};
