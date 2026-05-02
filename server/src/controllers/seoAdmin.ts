import type { Request, Response, NextFunction } from 'express';
import {
  dismissInsight,
  getInsightDetail,
  INSIGHT_BUCKETS,
  listInsights,
  markInsightActioned,
  type InsightBucket,
} from '../services/gsc/bucketClassifier';
import { getGscHealth, runWeeklyIngest } from '../services/gsc/gscIngest';
import {
  CLUSTER_BUCKETS,
  CLUSTER_HORIZONS,
  dismissCluster,
  getClusterDetail,
  listClusters,
  markClusterActioned,
  type ClusterBucket,
  type ClusterHorizon,
} from '../services/gsc/queryClusterer';
import {
  listSeoActions,
  proposeRewrite,
  rollbackSeoAction,
  shipRewrite,
} from '../services/seo/metadataRewriter';
import {
  listPendingFeedbackActions,
  measureSeoAction,
} from '../services/seo/feedbackMeasurement';
import { isPaused, setPaused } from '../services/seo/agentControl';
import {
  approveSeoProposal,
  generateEvergreenRoutingProposal,
  generatePackagingFixProposal,
  generateProposal,
  generateProposalFromCluster,
  generateProposalFromKeywordOpportunity,
  linkProposalDraft,
  listSeoProposals,
  rejectSeoProposal,
  type SeoProposalStatusFilter,
} from '../services/seo/briefGenerator';
import {
  getSeoExperiment,
  listSeoExperiments,
  reviewSeoExperiment,
  type SeoExperimentStatusFilter,
} from '../services/seo/experimentLedger';
import {
  getSeoPackagingAudit,
  listSeoPackagingAudits,
} from '../services/seo/serpPackagingAudit';
import { getSerperUsageSummary } from '../services/seo/serperClient';
import {
  getLatestAgentRunStatus,
  setLatestAgentRunStatus,
  type SeoAgentRunStatusRecord,
} from '../services/seo/agentRunStatus';
import {
  archiveKeywordOpportunity,
  createEditorialKeywordOpportunity,
  getKeywordOpportunity,
  listKeywordOpportunities,
  markKeywordOpportunityPromoted,
  refreshKeywordOpportunitySerp,
  rebuildKeywordPortfolio,
  type KeywordOpportunitySourceFilter,
  type KeywordOpportunityStatusFilter,
} from '../services/seo/keywordDiscovery';

function parseOptionalPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseBucket(value: unknown): InsightBucket {
  if (typeof value !== 'string' || !INSIGHT_BUCKETS.includes(value as InsightBucket)) {
    return 'winnable_loss';
  }

  return value as InsightBucket;
}

function parseClusterBucket(value: unknown): ClusterBucket {
  if (typeof value !== 'string' || !CLUSTER_BUCKETS.includes(value as ClusterBucket)) {
    return 'cluster_content_gap';
  }

  return value as ClusterBucket;
}

function parseClusterHorizon(value: unknown): ClusterHorizon {
  if (typeof value !== 'string' || !CLUSTER_HORIZONS.includes(value as ClusterHorizon)) {
    return '90d';
  }

  return value as ClusterHorizon;
}

function parseActionStatus(value: unknown): 'all' | 'shipped' | 'rolled_back' | 'measured' {
  if (value === 'shipped' || value === 'rolled_back' || value === 'measured') {
    return value;
  }

  return 'all';
}

function parseProposalStatus(value: unknown): SeoProposalStatusFilter {
  if (
    value === 'pending' ||
    value === 'drafting' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'shipped'
  ) {
    return value;
  }

  return 'all';
}

function parseExperimentStatus(value: unknown): SeoExperimentStatusFilter {
  if (
    value === 'planned'
    || value === 'running'
    || value === 'won'
    || value === 'flat'
    || value === 'lost'
    || value === 'archived'
  ) {
    return value;
  }

  return 'all';
}

function parseKeywordOpportunityStatus(value: unknown): KeywordOpportunityStatusFilter {
  if (
    value === 'discovered'
    || value === 'scored'
    || value === 'promoted'
    || value === 'archived'
  ) {
    return value;
  }

  return 'all';
}

function parseKeywordOpportunitySource(value: unknown): KeywordOpportunitySourceFilter {
  if (
    value === 'gsc_cluster'
    || value === 'google_trends'
    || value === 'serp_sample'
    || value === 'editorial_seed'
  ) {
    return value;
  }

  return 'all';
}

function parseScoreInput(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return Math.round(parsed);
}

export async function ingest(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await runWeeklyIngest();
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const bucket = parseBucket(req.query.bucket);
    const limit = parseOptionalPositiveInt(req.query.limit, 50);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
    const result = await listInsights({
      bucket,
      limit,
      page,
      weekStart,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const insight = await getInsightDetail(req.params.id);
    if (!insight) {
      res.status(404).json({ error: 'SEO insight not found' });
      return;
    }

    res.json(insight);
  } catch (error) {
    next(error);
  }
}

export async function dismiss(req: Request, res: Response, next: NextFunction) {
  try {
    await dismissInsight(req.params.id);
    res.json({ id: req.params.id, status: 'dismissed' });
  } catch (error) {
    next(error);
  }
}

export async function action(req: Request, res: Response, next: NextFunction) {
  try {
    await markInsightActioned(req.params.id);
    res.json({ id: req.params.id, status: 'actioned' });
  } catch (error) {
    next(error);
  }
}

export async function health(_req: Request, res: Response, next: NextFunction) {
  try {
    const [status, paused, agentRun, serper] = await Promise.all([
      getGscHealth(),
      isPaused(),
      getLatestAgentRunStatus(),
      getSerperUsageSummary(),
    ]);
    res.json({
      lastRunAt: status.lastRunAt?.toISOString() ?? null,
      finalizedThroughDate: status.finalizedThroughDate,
      lastRowCount: status.lastRowCount,
      lastWeekCovered: status.lastWeekCovered,
      totalRowsLast30d: status.totalRowsLast30d,
      clusterWindows: status.clusterWindows,
      paused,
      agentRun,
      serper,
    });
  } catch (error) {
    next(error);
  }
}

export async function listClusterOpportunities(req: Request, res: Response, next: NextFunction) {
  try {
    const horizon = parseClusterHorizon(req.query.horizon);
    const bucket = parseClusterBucket(req.query.bucket);
    const limit = parseOptionalPositiveInt(req.query.limit, 50);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const result = await listClusters({
      horizon,
      bucket,
      limit,
      page,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function clusterDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const cluster = await getClusterDetail(req.params.id);
    if (!cluster) {
      res.status(404).json({ error: 'SEO cluster not found' });
      return;
    }

    res.json(cluster);
  } catch (error) {
    next(error);
  }
}

export async function dismissClusterOpportunity(req: Request, res: Response, next: NextFunction) {
  try {
    await dismissCluster(req.params.id);
    res.json({ id: req.params.id, status: 'dismissed' });
  } catch (error) {
    next(error);
  }
}

export async function actionClusterOpportunity(req: Request, res: Response, next: NextFunction) {
  try {
    await markClusterActioned(req.params.id);
    res.json({ id: req.params.id, status: 'actioned' });
  } catch (error) {
    next(error);
  }
}

export async function generateProposalFromClusterOpportunity(req: Request, res: Response, next: NextFunction) {
  try {
    const proposal = await generateProposalFromCluster(req.params.id);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function proposeInsightRewrite(req: Request, res: Response, next: NextFunction) {
  try {
    const proposal = await proposeRewrite(req.params.id);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function shipInsightRewrite(req: Request, res: Response, next: NextFunction) {
  try {
    const actionRecord = await shipRewrite(req.params.id, false);
    res.json(actionRecord);
  } catch (error) {
    next(error);
  }
}

export async function actions(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseOptionalPositiveInt(req.query.limit, 25);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const targetType = typeof req.query.targetType === 'string' ? req.query.targetType : undefined;
    const status = parseActionStatus(req.query.status);

    const result = await listSeoActions({
      targetType,
      limit,
      page,
      status,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function pendingFeedback(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listPendingFeedbackActions();
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function measureAction(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await measureSeoAction(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function rollback(req: Request, res: Response, next: NextFunction) {
  try {
    const actionRecord = await rollbackSeoAction(req.params.id);
    res.json(actionRecord);
  } catch (error) {
    next(error);
  }
}

export async function proposals(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseOptionalPositiveInt(req.query.limit, 25);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const status = parseProposalStatus(req.query.status);
    const result = await listSeoProposals({
      status,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function generateProposalFromInsight(req: Request, res: Response, next: NextFunction) {
  try {
    const proposal = await generateProposal(req.params.id);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function approveProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await approveSeoProposal(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function rejectProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: unknown };
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    const proposal = await rejectSeoProposal(req.params.id, reason);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function linkProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const { draftPostId } = req.body as { draftPostId?: unknown };
    if (typeof draftPostId !== 'string' || draftPostId.trim().length === 0) {
      res.status(400).json({ error: 'draftPostId is required' });
      return;
    }

    const proposal = await linkProposalDraft(req.params.id, draftPostId);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function experiments(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseOptionalPositiveInt(req.query.limit, 25);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const status = parseExperimentStatus(req.query.status);
    const result = await listSeoExperiments({
      status,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function packaging(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseOptionalPositiveInt(req.query.limit, 50);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const result = await listSeoPackagingAudits({
      limit,
      page,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function packagingDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const audit = await getSeoPackagingAudit(req.params.id);
    if (!audit) {
      res.status(404).json({ error: 'SEO packaging audit not found' });
      return;
    }

    res.json(audit);
  } catch (error) {
    next(error);
  }
}

export async function proposePackagingEvergreen(req: Request, res: Response, next: NextFunction) {
  try {
    const audit = await getSeoPackagingAudit(req.params.id);
    if (!audit) {
      res.status(404).json({ error: 'SEO packaging audit not found' });
      return;
    }

    if (!audit.evergreenRecommendation) {
      res.status(409).json({ error: 'This packaging audit does not have an evergreen-routing recommendation' });
      return;
    }

    const proposal = await generateEvergreenRoutingProposal(audit.evergreenRecommendation.clusterId);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function proposePackagingFix(req: Request, res: Response, next: NextFunction) {
  try {
    const audit = await getSeoPackagingAudit(req.params.id);
    if (!audit) {
      res.status(404).json({ error: 'SEO packaging audit not found' });
      return;
    }

    if (audit.issues.every((issue) => issue.type === 'evergreen_routing')) {
      res.status(409).json({ error: 'This packaging audit does not have a manual packaging-fix recommendation' });
      return;
    }

    const proposal = await generatePackagingFixProposal(audit.id);
    res.json(proposal);
  } catch (error) {
    next(error);
  }
}

export async function experimentDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const experiment = await getSeoExperiment(req.params.id);
    res.json(experiment);
  } catch (error) {
    next(error);
  }
}

export async function reviewExperiment(req: Request, res: Response, next: NextFunction) {
  try {
    const experiment = await reviewSeoExperiment(req.params.id);
    res.json(experiment);
  } catch (error) {
    next(error);
  }
}

export async function portfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseOptionalPositiveInt(req.query.limit, 25);
    const page = parseOptionalPositiveInt(req.query.page, 1);
    const status = parseKeywordOpportunityStatus(req.query.status);
    const sourceType = parseKeywordOpportunitySource(req.query.sourceType);
    const result = await listKeywordOpportunities({
      status,
      sourceType,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function portfolioDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const opportunity = await getKeywordOpportunity(req.params.id);
    if (!opportunity) {
      res.status(404).json({ error: 'SEO keyword opportunity not found' });
      return;
    }

    res.json(opportunity);
  } catch (error) {
    next(error);
  }
}

export async function rebuildPortfolio(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await rebuildKeywordPortfolio();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createPortfolioEditorialSeed(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      seedQuery,
      pageTypeRecommendation,
      targetUrl,
      demandProxy,
      competitionProxy,
      laeaFitScore,
      rationale,
    } = req.body as Record<string, unknown>;

    if (typeof seedQuery !== 'string' || seedQuery.trim().length === 0) {
      res.status(400).json({ error: 'seedQuery is required' });
      return;
    }

    if (typeof pageTypeRecommendation !== 'string' || pageTypeRecommendation.trim().length === 0) {
      res.status(400).json({ error: 'pageTypeRecommendation is required' });
      return;
    }

    if (typeof rationale !== 'string' || rationale.trim().length === 0) {
      res.status(400).json({ error: 'rationale is required' });
      return;
    }

    const parsedDemand = parseScoreInput(demandProxy);
    const parsedCompetition = parseScoreInput(competitionProxy);
    const parsedFit = parseScoreInput(laeaFitScore);

    if (parsedDemand === null || parsedCompetition === null || parsedFit === null) {
      res.status(400).json({ error: 'demandProxy, competitionProxy, and laeaFitScore must be numbers between 0 and 100' });
      return;
    }

    if (targetUrl !== undefined && targetUrl !== null && typeof targetUrl !== 'string') {
      res.status(400).json({ error: 'targetUrl must be a string when provided' });
      return;
    }

    const opportunity = await createEditorialKeywordOpportunity({
      seedQuery,
      pageTypeRecommendation,
      targetUrl: typeof targetUrl === 'string' ? targetUrl : null,
      demandProxy: parsedDemand,
      competitionProxy: parsedCompetition,
      laeaFitScore: parsedFit,
      rationale,
    });

    res.status(201).json(opportunity);
  } catch (error) {
    next(error);
  }
}

export async function promotePortfolioOpportunity(req: Request, res: Response, next: NextFunction) {
  try {
    const opportunity = await getKeywordOpportunity(req.params.id);
    if (!opportunity) {
      res.status(404).json({ error: 'SEO keyword opportunity not found' });
      return;
    }

    if (opportunity.status === 'promoted') {
      res.status(409).json({ error: 'This keyword opportunity has already been promoted' });
      return;
    }

    if (opportunity.status === 'archived') {
      res.status(409).json({ error: 'Archived keyword opportunities cannot be promoted' });
      return;
    }

    if (opportunity.pageTypeRecommendation !== 'blog_post') {
      res.status(409).json({
        error: 'Only blog-post keyword opportunities can enter the proposal lane in this portfolio slice',
      });
      return;
    }

    if (!opportunity.clusterSnapshotId && !opportunity.targetUrl) {
      res.status(409).json({
        error: 'This keyword opportunity needs either cluster context or a concrete target URL before it can enter the proposal lane',
      });
      return;
    }

    const proposal = (
      opportunity.sourceType === 'gsc_cluster'
      && opportunity.clusterSnapshotId
    )
      ? await generateProposalFromCluster(opportunity.clusterSnapshotId)
      : await generateProposalFromKeywordOpportunity(opportunity.id);
    const updatedOpportunity = await markKeywordOpportunityPromoted(opportunity.id);

    res.json({
      opportunity: updatedOpportunity,
      proposal,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshPortfolioOpportunitySerp(req: Request, res: Response, next: NextFunction) {
  try {
    const opportunity = await refreshKeywordOpportunitySerp(req.params.id);
    res.json({ opportunity });
  } catch (error) {
    next(error);
  }
}

export async function archivePortfolioOpportunity(req: Request, res: Response, next: NextFunction) {
  try {
    const opportunity = await getKeywordOpportunity(req.params.id);
    if (!opportunity) {
      res.status(404).json({ error: 'SEO keyword opportunity not found' });
      return;
    }

    if (opportunity.status === 'archived') {
      res.status(409).json({ error: 'This keyword opportunity is already archived' });
      return;
    }

    if (opportunity.status === 'promoted') {
      res.status(409).json({
        error: 'Promoted keyword opportunities stay attached to the proposal lane and cannot be archived here',
      });
      return;
    }

    const updatedOpportunity = await archiveKeywordOpportunity(opportunity.id);
    res.json({ opportunity: updatedOpportunity });
  } catch (error) {
    next(error);
  }
}

export async function pause(req: Request, res: Response, next: NextFunction) {
  try {
    const { paused } = req.body as { paused?: unknown };
    if (typeof paused !== 'boolean') {
      res.status(400).json({ error: 'paused must be a boolean' });
      return;
    }

    const nextState = await setPaused(paused);
    res.json({ paused: nextState });
  } catch (error) {
    next(error);
  }
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseNonNegativeInteger(value: unknown, fallback: number = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed;
}

export async function updateRunStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      status,
      startedAt,
      completedAt,
      weekStart,
      shippedCount,
      proposalCount,
      humanOnlyCount,
      measuredCount,
      digestUrl,
      errorMessage,
    } = req.body as Partial<SeoAgentRunStatusRecord>;

    if (status !== 'success' && status !== 'failed') {
      res.status(400).json({ error: 'status must be success or failed' });
      return;
    }

    if (!isValidIsoDate(startedAt) || !isValidIsoDate(completedAt)) {
      res.status(400).json({ error: 'startedAt and completedAt must be ISO timestamps' });
      return;
    }

    if (weekStart !== undefined && weekStart !== null && !isValidIsoDate(weekStart)) {
      res.status(400).json({ error: 'weekStart must be null or an ISO timestamp' });
      return;
    }

    if (digestUrl !== undefined && digestUrl !== null && typeof digestUrl !== 'string') {
      res.status(400).json({ error: 'digestUrl must be null or a string' });
      return;
    }

    if (errorMessage !== undefined && errorMessage !== null && typeof errorMessage !== 'string') {
      res.status(400).json({ error: 'errorMessage must be null or a string' });
      return;
    }

    const nextStatus = await setLatestAgentRunStatus({
      status,
      startedAt,
      completedAt,
      weekStart: weekStart ?? null,
      shippedCount: parseNonNegativeInteger(shippedCount),
      proposalCount: parseNonNegativeInteger(proposalCount),
      humanOnlyCount: parseNonNegativeInteger(humanOnlyCount),
      measuredCount: parseNonNegativeInteger(measuredCount),
      digestUrl: digestUrl ?? null,
      errorMessage: errorMessage ?? null,
    });

    res.json(nextStatus);
  } catch (error) {
    next(error);
  }
}
