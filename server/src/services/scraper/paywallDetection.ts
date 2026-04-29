// Paywall detection heuristic. Pure function — no I/O, no side effects.
// Tunable constants live at the top so we can iterate without spelunking.
//
// Bias: false negatives over false positives. The badge has to stay
// trustworthy, so a single weak signal (short content alone) does NOT fire.

export type PaywallReason =
  | 'extension_overlay'
  | 'extension_phrase'
  | 'extension_short_content'
  | 'known_domain'
  | 'short_content'
  | 'paywall_phrase'
  | 'http_402'
  | 'http_403';

export interface PaywallSignals {
  isPaywalled: boolean;
  reason: PaywallReason | null;
}

export interface PaywallSignalInput {
  url: string;
  content?: string | null;
  title?: string | null;
  httpStatus?: number;
  wordCount?: number;
  // Optional caller-provided override (e.g. from the Chrome extension's
  // live-DOM heuristic, which sees the rendered page in the user's
  // authenticated browser). If set, it wins.
  extensionFlag?: PaywallReason | null;
}

// Hostnames whose default editorial output is paywalled. We trust this list
// because we curate it; a known-paywalled domain is the strongest single
// signal we accept on its own.
export const KNOWN_PAYWALLED_HOSTNAMES = new Set<string>([
  'nytimes.com',
  'wsj.com',
  'ft.com',
  'bloomberg.com',
  'theinformation.com',
  'washingtonpost.com',
  'theatlantic.com',
  'newyorker.com',
]);

export const PAYWALL_PHRASES: RegExp[] = [
  /subscribe to continue/i,
  /subscription required/i,
  /sign in to read/i,
  /log in to read/i,
  /create.*account.*to continue/i,
  /to continue reading/i,
  /members? only/i,
  /subscribers? only/i,
];

export const SHORT_CONTENT_THRESHOLD = 200; // word count — only fires WITH another signal

function normalizeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function matchesPaywallPhrase(text: string): boolean {
  return PAYWALL_PHRASES.some((re) => re.test(text));
}

export function evaluatePaywallSignals(input: PaywallSignalInput): PaywallSignals {
  // 1. Caller-provided extension flag wins everything.
  if (input.extensionFlag) {
    return { isPaywalled: true, reason: input.extensionFlag };
  }

  // 2. HTTP status codes that explicitly indicate access denial.
  if (input.httpStatus === 402) return { isPaywalled: true, reason: 'http_402' };
  if (input.httpStatus === 403) return { isPaywalled: true, reason: 'http_403' };

  const haystack = `${input.title ?? ''} ${input.content ?? ''}`;

  // 3. Phrase match in title or body.
  if (haystack.trim().length > 0 && matchesPaywallPhrase(haystack)) {
    return { isPaywalled: true, reason: 'paywall_phrase' };
  }

  // 4. Known-paywalled hostname. We trust the list — fire on host alone.
  const hostname = normalizeHostname(input.url);
  if (hostname && KNOWN_PAYWALLED_HOSTNAMES.has(hostname)) {
    return { isPaywalled: true, reason: 'known_domain' };
  }

  // 5. Short content alone is NOT enough — link blogs and breaking-news
  //    one-liners are legitimately short. Require a co-signal we already
  //    handled above; if we're here, no co-signal fired.
  return { isPaywalled: false, reason: null };
}
