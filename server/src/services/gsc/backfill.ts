import { runBackfill } from './gscIngest';

function parseDaysBack(argv: string[]): number {
  const daysIndex = argv.findIndex((arg) => arg === '--days');
  const daysValue = daysIndex >= 0 ? argv[daysIndex + 1] : undefined;

  if (!daysValue) {
    return 90;
  }

  const parsed = Number.parseInt(daysValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid --days value: ${daysValue}`);
  }

  return parsed;
}

async function main() {
  const daysBack = parseDaysBack(process.argv.slice(2));
  const result = await runBackfill(daysBack);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('[GSC_BACKFILL] Failed:', error);
  process.exitCode = 1;
});
