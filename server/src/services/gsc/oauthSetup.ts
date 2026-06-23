import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { google } from 'googleapis';
import { GSC_SCOPES } from './gscClient';

const DEFAULT_PORT = 3005;
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_SSM_PARAM = '/ai-timeline/prod/gsc-oauth-credentials-json';
const DEFAULT_INGESTION_FUNCTION = 'ai-timeline-ingestion-prod';

interface OAuthClientSecretBlock {
  client_id?: string;
  client_secret?: string;
  redirect_uris?: string[];
}

interface OAuthClientSecretFile {
  installed?: OAuthClientSecretBlock;
  web?: OAuthClientSecretBlock;
}

interface SetupOptions {
  clientSecretPath: string;
  redirectUri?: string;
  port: number;
  awsRegion: string;
  ssmParam: string;
  storeSsm: boolean;
  verifyIngest: boolean;
  runDigest: boolean;
  functionName: string;
}

interface GscOAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

function printLine(line: string = ''): void {
  process.stdout.write(`${line}\n`);
}

function getArgValue(argv: string[], flag: string): string | undefined {
  const index = argv.findIndex((arg) => arg === flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`Invalid --port value: ${value}`);
  }

  return parsed;
}

function parseArgs(argv: string[]): SetupOptions {
  const clientSecretPath = getArgValue(argv, '--client-secret');
  if (!clientSecretPath) {
    throw new Error('Missing required --client-secret /path/to/client_secret.json');
  }

  return {
    clientSecretPath,
    redirectUri: getArgValue(argv, '--redirect-uri'),
    port: parsePort(getArgValue(argv, '--port')),
    awsRegion: getArgValue(argv, '--aws-region') ?? process.env.AWS_REGION ?? DEFAULT_REGION,
    ssmParam: getArgValue(argv, '--ssm-param') ?? DEFAULT_SSM_PARAM,
    storeSsm: hasFlag(argv, '--store-ssm'),
    verifyIngest: hasFlag(argv, '--verify-ingest'),
    runDigest: hasFlag(argv, '--run-digest'),
    functionName: getArgValue(argv, '--function-name') ?? DEFAULT_INGESTION_FUNCTION,
  };
}

async function loadOAuthClientSecrets(
  filePath: string
): Promise<Required<Pick<OAuthClientSecretBlock, 'client_id' | 'client_secret'>> & {
  redirectUris: string[];
  source: 'installed' | 'web';
}> {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as OAuthClientSecretFile;
  const source = parsed.installed ? 'installed' : parsed.web ? 'web' : null;

  if (!source) {
    throw new Error('OAuth client file must contain either an "installed" or "web" block');
  }

  const block = parsed[source];
  if (!block?.client_id || !block.client_secret) {
    throw new Error(`OAuth client file is missing client_id or client_secret in the "${source}" block`);
  }

  return {
    client_id: block.client_id,
    client_secret: block.client_secret,
    redirectUris: block.redirect_uris ?? [],
    source,
  };
}

function resolveRedirectUri(
  secrets: Awaited<ReturnType<typeof loadOAuthClientSecrets>>,
  options: SetupOptions
): string {
  if (options.redirectUri) {
    return options.redirectUri;
  }

  if (secrets.source === 'web') {
    const localhostRedirect = secrets.redirectUris.find((uri) => uri.startsWith('http://127.0.0.1') || uri.startsWith('http://localhost'));
    if (!localhostRedirect) {
      throw new Error(
        'Web OAuth clients must pass --redirect-uri or include a localhost redirect URI in the downloaded JSON'
      );
    }

    return localhostRedirect;
  }

  return `http://127.0.0.1:${options.port}/oauth2callback`;
}

function waitForAuthorizationCode(redirectUri: string, expectedState: string): Promise<string> {
  const callbackUrl = new URL(redirectUri);
  const hostname = callbackUrl.hostname;
  const port = Number(callbackUrl.port || 80);
  const path = callbackUrl.pathname || '/';

  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url ?? '/', `${callbackUrl.protocol}//${request.headers.host}`);
        if (requestUrl.pathname !== path) {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }

        const code = requestUrl.searchParams.get('code');
        const state = requestUrl.searchParams.get('state');
        const error = requestUrl.searchParams.get('error');

        if (error) {
          response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end(`OAuth authorization failed: ${error}`);
          server.close();
          reject(new Error(`OAuth authorization failed: ${error}`));
          return;
        }

        if (!code || state !== expectedState) {
          response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Missing authorization code or invalid state');
          server.close();
          reject(new Error('Missing authorization code or invalid OAuth state'));
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<html><body><h1>GSC authorization received.</h1><p>You can close this tab.</p></body></html>');
        server.close();
        resolve(code);
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    server.on('error', reject);
    server.listen(port, hostname, () => {
      printLine(`[GSC_OAUTH_SETUP] Waiting for Google OAuth callback on ${redirectUri}`);
    });
  });
}

async function storeCredentialsInSsm(
  credentials: GscOAuthCredentials,
  options: SetupOptions
): Promise<void> {
  const client = new SSMClient({ region: options.awsRegion });
  await client.send(new PutParameterCommand({
    Name: options.ssmParam,
    Type: 'SecureString',
    Overwrite: true,
    Value: JSON.stringify(credentials),
  }));
}

async function invokeLambdaAction(
  action: 'gscWeeklyIngest' | 'seoWeeklyDigest',
  options: SetupOptions
): Promise<unknown> {
  const client = new LambdaClient({ region: options.awsRegion });
  const command = new InvokeCommand({
    FunctionName: options.functionName,
    Payload: Buffer.from(JSON.stringify(action === 'seoWeeklyDigest'
      ? { action, force: true, runEditorial: false }
      : { action })),
  });
  const response = await client.send(command);
  const payloadText = Buffer.from(response.Payload ?? new Uint8Array()).toString('utf8');
  const payload = payloadText ? JSON.parse(payloadText) : null;

  if (response.FunctionError) {
    throw new Error(`${action} Lambda failed: ${payloadText || response.FunctionError}`);
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'statusCode' in payload &&
    typeof payload.statusCode === 'number' &&
    payload.statusCode >= 400
  ) {
    const body = typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body ?? {});
    throw new Error(`${action} returned HTTP ${payload.statusCode}: ${body}`);
  }

  return payload;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const secrets = await loadOAuthClientSecrets(options.clientSecretPath);
  const redirectUri = resolveRedirectUri(secrets, options);
  const oauth2Client = new google.auth.OAuth2(
    secrets.client_id,
    secrets.client_secret,
    redirectUri
  );

  const { codeVerifier, codeChallenge } = await oauth2Client.generateCodeVerifierAsync();
  const state = randomUUID();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GSC_SCOPES,
    prompt: 'consent',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  printLine();
  printLine('Open this URL in a browser signed into the Search Console owner account:');
  printLine();
  printLine(authUrl);
  printLine();

  const code = await waitForAuthorizationCode(redirectUri, state);
  const { tokens } = await oauth2Client.getToken({
    code,
    codeVerifier,
    redirect_uri: redirectUri,
  });

  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Re-run the flow with prompt=consent on a fresh consent screen.');
  }

  const credentials = {
    clientId: secrets.client_id,
    clientSecret: secrets.client_secret,
    refreshToken: tokens.refresh_token,
  };

  if (!options.storeSsm) {
    printLine();
    printLine(`Store this JSON in SSM SecureString ${options.ssmParam}:`);
    printLine();
    printLine(JSON.stringify(credentials, null, 2));
    return;
  }

  await storeCredentialsInSsm(credentials, options);
  printLine();
  printLine(`[GSC_OAUTH_SETUP] Stored refreshed credentials in SSM SecureString ${options.ssmParam}.`);

  if (options.verifyIngest) {
    printLine('[GSC_OAUTH_SETUP] Verifying with gscWeeklyIngest Lambda action...');
    await invokeLambdaAction('gscWeeklyIngest', options);
    printLine('[GSC_OAUTH_SETUP] GSC ingest verification succeeded.');
  }

  if (options.runDigest) {
    printLine('[GSC_OAUTH_SETUP] Running forced seoWeeklyDigest Lambda action without Tuesday editorial...');
    await invokeLambdaAction('seoWeeklyDigest', options);
    printLine('[GSC_OAUTH_SETUP] SEO digest verification succeeded.');
  }
}

main().catch((error) => {
  console.error('[GSC_OAUTH_SETUP] Failed:', error);
  process.exitCode = 1;
});
