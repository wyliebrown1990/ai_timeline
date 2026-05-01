import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { google } from 'googleapis';
import type { searchconsole_v1 } from 'googleapis';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const GSC_OAUTH_CREDENTIALS_PARAM =
  process.env.GSC_OAUTH_CREDENTIALS_PARAM ?? '/ai-timeline/prod/gsc-oauth-credentials-json';
const GSC_SITE_URL_PARAM =
  process.env.GSC_SITE_URL_PARAM ?? '/ai-timeline/prod/gsc-site-url';
export const GSC_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const PT_TIMEZONE = 'America/Los_Angeles';
const FINALIZATION_LAG_DAYS = 3;
const MAX_GSC_ROW_LIMIT = 25_000;

export type GscDimension = 'date' | 'query' | 'page' | 'device' | 'country';

export interface GscQueryOptions {
  startDate: string;
  endDate: string;
  dimensions: GscDimension[];
  rowLimit?: number;
  startRow?: number;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface GscClientContext {
  searchAnalytics: searchconsole_v1.Resource$Searchanalytics;
  siteUrl: string;
}

let ssmClient: SSMClient | null = null;
let gscClientContextPromise: Promise<GscClientContext> | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }
  return ssmClient;
}

function getDatePartsInTimeZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!year || !month || !day) {
    throw new Error(`Unable to compute date parts for timezone "${timeZone}"`);
  }

  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDatePartsToIso(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getCurrentPtDateString(now: Date = new Date()): string {
  return formatDatePartsToIso(getDatePartsInTimeZone(now, PT_TIMEZONE));
}

export function isoDateStringToUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function shiftIsoDate(isoDate: string, offsetDays: number): string {
  const shifted = isoDateStringToUtcDate(isoDate);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

  return shifted.toISOString().slice(0, 10);
}

export function diffIsoDatesInDays(laterIsoDate: string, earlierIsoDate: string): number {
  const diffMs = isoDateStringToUtcDate(laterIsoDate).getTime()
    - isoDateStringToUtcDate(earlierIsoDate).getTime();

  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function getLatestFinalizedPtDate(now: Date = new Date()): string {
  return shiftIsoDate(getCurrentPtDateString(now), -FINALIZATION_LAG_DAYS);
}

export function getMostRecentFinalizedWindow(
  now: Date = new Date(),
  days: number = 7
): { startDate: string; endDate: string } {
  const endDate = getLatestFinalizedPtDate(now);
  const startDate = shiftIsoDate(endDate, -(days - 1));

  return { startDate, endDate };
}

async function getParameterValue(name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });
  const response = await getSsmClient().send(command);
  const value = response.Parameter?.Value;

  if (!value) {
    throw new Error(`Missing required SSM parameter: ${name}`);
  }

  return value;
}

function parseOAuthCredentials(rawCredentials: string): OAuthCredentials {
  const credentials = JSON.parse(rawCredentials) as Partial<OAuthCredentials>;

  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    throw new Error(
      `SSM parameter ${GSC_OAUTH_CREDENTIALS_PARAM} does not contain valid GSC OAuth credentials`
    );
  }

  return {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
  };
}

async function loadClientContext(): Promise<GscClientContext> {
  const [oauthCredentialsJson, siteUrl] = await Promise.all([
    getParameterValue(GSC_OAUTH_CREDENTIALS_PARAM),
    getParameterValue(GSC_SITE_URL_PARAM),
  ]);

  const credentials = parseOAuthCredentials(oauthCredentialsJson);

  const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
  auth.setCredentials({
    refresh_token: credentials.refreshToken,
  });

  const client = google.searchconsole({
    version: 'v1',
    auth,
  });

  return {
    searchAnalytics: client.searchanalytics,
    siteUrl,
  };
}

async function getClientContext(): Promise<GscClientContext> {
  if (!gscClientContextPromise) {
    gscClientContextPromise = loadClientContext().catch((error) => {
      gscClientContextPromise = null;
      throw error;
    });
  }

  return gscClientContextPromise;
}

export async function queryDateRange(options: GscQueryOptions): Promise<GscRow[]> {
  const { searchAnalytics, siteUrl } = await getClientContext();
  const rowLimit = Math.min(MAX_GSC_ROW_LIMIT, Math.max(1, options.rowLimit ?? MAX_GSC_ROW_LIMIT));

  const response = await searchAnalytics.query({
    siteUrl,
    requestBody: {
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: options.dimensions,
      rowLimit,
      startRow: options.startRow ?? 0,
      type: 'web',
      dataState: 'final',
    },
  });

  const rows = response.data.rows ?? [];
  return rows.map((row) => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

export async function queryAllRows(options: Omit<GscQueryOptions, 'rowLimit' | 'startRow'>): Promise<GscRow[]> {
  const rows: GscRow[] = [];
  let startRow = 0;

  while (true) {
    const page = await queryDateRange({
      ...options,
      rowLimit: MAX_GSC_ROW_LIMIT,
      startRow,
    });

    rows.push(...page);
    if (page.length < MAX_GSC_ROW_LIMIT) {
      break;
    }

    startRow += MAX_GSC_ROW_LIMIT;
  }

  return rows;
}

export function resetGscClientCacheForTests() {
  ssmClient = null;
  gscClientContextPromise = null;
}
