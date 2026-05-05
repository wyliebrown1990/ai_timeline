#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !args.includes('--force');
const force = args.includes('--force');
const functionName = process.env.SEO_DIGEST_FUNCTION_NAME || 'ai-timeline-ingestion-prod';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(process.cwd(), 'tmp', 'seo-weekly-digest', timestamp);
const rawFile = path.join(outDir, 'lambda-response.json');
const summaryFile = path.join(outDir, 'summary.json');
const payload = JSON.stringify({
  action: 'seoWeeklyDigest',
  dryRun,
  force,
});

await mkdir(outDir, { recursive: true });

const result = spawnSync('aws', [
  'lambda',
  'invoke',
  '--function-name',
  functionName,
  '--payload',
  payload,
  rawFile,
  '--cli-binary-format',
  'raw-in-base64-out',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const raw = JSON.parse(await readFile(rawFile, 'utf8'));
const body = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
const summary = body?.summary ?? body;

await writeFile(summaryFile, JSON.stringify(summary, null, 2));
process.stdout.write(JSON.stringify({
  functionName,
  dryRun,
  force,
  summaryFile,
  status: summary?.status,
  weekStart: summary?.weekStart,
}, null, 2) + '\n');
