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
    '<html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">',
    `<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(statusLine)}</h1>`,
    '<p>What to do next: review any generated posts or skipped opportunities from the admin SEO pages.</p>',
    `<p><a href="${escapeHtml(summary.digestUrl)}">Open SEO dashboard</a> &nbsp; <a href="https://letaiexplainai.com/admin/blog">Open Blog CMS</a> &nbsp; <a href="${CLOUDWATCH_LOG_URL}">Open CloudWatch logs</a></p>`,
    '<h2 style="font-size:16px">Selected for this run</h2>',
    `<pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:6px">${escapeHtml(selectedLines)}</pre>`,
    '<h2 style="font-size:16px">Skipped or deferred</h2>',
    `<pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:6px">${escapeHtml(skippedLines)}</pre>`,
    '<h2 style="font-size:16px">Spend / Serper</h2>',
    `<p>${escapeHtml(serperLine)}</p>`,
    '<h2 style="font-size:16px">Warnings</h2>',
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
