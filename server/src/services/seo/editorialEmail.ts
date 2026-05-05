import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { normalizeEmailError, sendEmail } from '../email';
import type { SeoEditorialTuesdayRunSummary } from './editorialAutopilotRunner';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const RECIPIENT_PARAM =
  process.env.SEO_EDITORIAL_RECAP_EMAIL_PARAM ?? '/ai-timeline/prod/seo-editorial-recap-email';
const SENDER_PARAM =
  process.env.SEO_EDITORIAL_SENDER_EMAIL_PARAM ?? '/ai-timeline/prod/seo-editorial-sender-email';
const DEFAULT_RECIPIENT = 'wyliedeveloper@gmail.com';
const CLOUDWATCH_LOG_URL =
  'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fai-timeline-ingestion-prod';

let ssmClient: SSMClient | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }
  return ssmClient;
}

function isParameterNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { name?: string; Code?: string };
  return maybeError.name === 'ParameterNotFound' || maybeError.Code === 'ParameterNotFound';
}

async function getOptionalParameter(name: string): Promise<string | null> {
  try {
    const response = await getSsmClient().send(new GetParameterCommand({ Name: name }));
    const value = response.Parameter?.Value?.trim();
    return value || null;
  } catch (error) {
    if (!isParameterNotFound(error)) {
      throw error;
    }
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decisionLabel(decision: SeoEditorialTuesdayRunSummary['decisions'][number]): string {
  return `${decision.title} (${decision.sourceType}, ${decision.action})`;
}

function decisionLinkLines(decision: SeoEditorialTuesdayRunSummary['decisions'][number]): string {
  return [
    decision.publicUrl ? ` public=${decision.publicUrl}` : '',
    decision.adminUrl ? ` edit=${decision.adminUrl}` : '',
    decision.sourceUrl ? ` source=${decision.sourceUrl}` : '',
  ].join('');
}

function decisionTextLine(decision: SeoEditorialTuesdayRunSummary['decisions'][number]): string {
  return `- ${decisionLabel(decision)}: ${decision.reason}${decisionLinkLines(decision)}`;
}

function decisionLinksHtml(decision: SeoEditorialTuesdayRunSummary['decisions'][number]): string {
  const links = [
    decision.publicUrl ? `<a href="${escapeHtml(decision.publicUrl)}">Review public post</a>` : null,
    decision.adminUrl ? `<a href="${escapeHtml(decision.adminUrl)}">Edit post</a>` : null,
    decision.sourceUrl ? `<a href="${escapeHtml(decision.sourceUrl)}">Open source ${escapeHtml(decision.sourceType)}</a>` : null,
  ].filter((link): link is string => Boolean(link));

  return links.length > 0
    ? `<p style="margin:8px 0 0">${links.join(' &nbsp; ')}</p>`
    : '';
}

function decisionCardHtml(decision: SeoEditorialTuesdayRunSummary['decisions'][number]): string {
  return [
    '<li style="margin:0 0 12px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;list-style:none">',
    `<strong>${escapeHtml(decision.title)}</strong>`,
    `<div style="margin-top:4px;color:#4b5563;font-size:13px">${escapeHtml(decision.sourceType)} · ${escapeHtml(decision.action)}</div>`,
    `<p style="margin:8px 0 0">${escapeHtml(decision.reason)}</p>`,
    decisionLinksHtml(decision),
    '</li>',
  ].join('');
}

function decisionSectionHtml(
  title: string,
  decisions: SeoEditorialTuesdayRunSummary['decisions'],
  emptyText: string,
): string {
  const body = decisions.length > 0
    ? `<ul style="margin:0;padding:0">${decisions.map(decisionCardHtml).join('')}</ul>`
    : `<p>${escapeHtml(emptyText)}</p>`;
  return `<h2 style="font-size:16px;margin:20px 0 8px">${escapeHtml(title)}</h2>${body}`;
}

export function buildEditorialRecapEmail(summary: SeoEditorialTuesdayRunSummary): {
  subject: string;
  text: string;
  html: string;
} {
  const warnings = [
    summary.errorMessage,
    summary.serper?.warningLevel && summary.serper.warningLevel !== 'ok'
      ? `Serper warning level: ${summary.serper.warningLevel}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const selected = summary.decisions.filter((decision) => decision.action !== 'skipped');
  const published = summary.decisions.filter((decision) => decision.status === 'auto_published');
  const drafts = summary.decisions.filter((decision) => decision.status === 'draft_created');
  const skipped = summary.decisions.filter((decision) => decision.action === 'skipped');
  const statusLine = `Published ${summary.publishedCount} | Drafts ready ${summary.draftCount} | Skipped ${summary.skippedCount} | Warnings ${warnings.length}`;
  const subject = `[LAEA SEO] Tuesday editorial ${summary.status}: ${statusLine}`;

  const selectedLines = selected.length > 0
    ? selected.map(decisionTextLine).join('\n')
    : '- None yet.';
  const skippedLines = skipped.length > 0
    ? skipped.map(decisionTextLine).join('\n')
    : '- None.';
  const warningLines = warnings.length > 0
    ? warnings.map((warning) => `- ${warning}`).join('\n')
    : '- None.';
  const serperLine = summary.serper
    ? `Credits used this week: ${summary.serper.creditsUsedWeek}; MTD spend: $${summary.serper.effectiveSpendMonthUsd.toFixed(3)}; remaining credits: ${summary.serper.remainingCredits ?? 'unknown'}; projected depletion: ${summary.serper.projectedDepletionDate ?? 'unknown'}; auto-top-up: ${summary.serper.autoTopupEnabled ? 'on' : 'off'}`
    : 'Serper state unavailable.';

  const text = [
    statusLine,
    '',
    'What to do next: review any generated posts or skipped opportunities from the admin SEO pages.',
    '',
    'Review links:',
    `- SEO dashboard: ${summary.digestUrl}`,
    '- Blog CMS: https://letaiexplainai.com/admin/blog',
    `- CloudWatch logs: ${CLOUDWATCH_LOG_URL}`,
    '',
    'Selected for this run:',
    selectedLines,
    '',
    'Skipped or deferred:',
    skippedLines,
    '',
    'Spend / Serper:',
    `- ${serperLine}`,
    '',
    'Warnings:',
    warningLines,
    '',
    `Run: ${summary.startedAt} -> ${summary.completedAt}`,
    `Week: ${summary.weekStart ?? 'unknown'}`,
  ].join('\n');

  const html = [
    '<!doctype html>',
    '<html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;margin:0;padding:16px">',
    `<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(statusLine)}</h1>`,
    '<p>What to do next: review any generated posts or skipped opportunities from the admin SEO pages.</p>',
    `<p style="margin:0 0 16px"><a href="${escapeHtml(summary.digestUrl)}">Open SEO dashboard</a> &nbsp; <a href="https://letaiexplainai.com/admin/blog">Open Blog CMS</a> &nbsp; <a href="${CLOUDWATCH_LOG_URL}">Open CloudWatch logs</a></p>`,
    decisionSectionHtml('Published posts', published, 'No posts published in this run.'),
    decisionSectionHtml('Drafts for review', drafts, 'No drafts created in this run.'),
    decisionSectionHtml('Skipped by gate', skipped, 'No skipped opportunities.'),
    '<h2 style="font-size:16px;margin:20px 0 8px">Spend / Serper</h2>',
    `<p>${escapeHtml(serperLine)}</p>`,
    '<h2 style="font-size:16px;margin:20px 0 8px">Warnings</h2>',
    `<pre style="white-space:pre-wrap;background:#fef3c7;padding:12px;border-radius:6px">${escapeHtml(warningLines)}</pre>`,
    `<p style="color:#6b7280;font-size:12px">Run: ${escapeHtml(summary.startedAt)} -> ${escapeHtml(summary.completedAt)} | Week: ${escapeHtml(summary.weekStart ?? 'unknown')}</p>`,
    '</body></html>',
  ].join('');

  return { subject, text, html };
}

export async function sendEditorialRecapEmail(summary: SeoEditorialTuesdayRunSummary): Promise<{
  sent: boolean;
  recipient: string;
  sender: string | null;
  errorMessage: string | null;
}> {
  const [recipient, sender] = await Promise.all([
    getOptionalParameter(RECIPIENT_PARAM),
    getOptionalParameter(SENDER_PARAM),
  ]);
  const nextRecipient = recipient ?? DEFAULT_RECIPIENT;

  if (!sender) {
    return {
      sent: false,
      recipient: nextRecipient,
      sender: null,
      errorMessage: `Missing SSM sender parameter ${SENDER_PARAM}`,
    };
  }

  const email = buildEditorialRecapEmail(summary);
  try {
    await sendEmail({
      from: sender,
      to: [nextRecipient],
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return {
      sent: true,
      recipient: nextRecipient,
      sender,
      errorMessage: null,
    };
  } catch (error) {
    const normalized = normalizeEmailError(error);
    return {
      sent: false,
      recipient: nextRecipient,
      sender,
      errorMessage: `${normalized.code}: ${normalized.message}`,
    };
  }
}

export function resetEditorialEmailForTests() {
  ssmClient = null;
}
