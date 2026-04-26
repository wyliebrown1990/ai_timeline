import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { runSubmit, type SubmitState } from '../lib/submit';
import { scrape, submitArticle } from '../../lib/api';
import { extractFromTab, getActiveTab } from '../lib/chromeBridge';
import { getForceReadabilityForDomain, setForceReadabilityForDomain } from '../../lib/storage';
import { StatusPanel } from './StatusPanel';
import { RecentSubmissions } from './RecentSubmissions';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface Props {
  onUnauthorized: () => void;
}

export function SubmitPanel({ onUnauthorized }: Props) {
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);
  const [tabTitle, setTabTitle] = useState<string | null>(null);
  const [forceReadability, setForceReadabilityState] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const host = useMemo(() => (tabUrl ? hostnameOf(tabUrl) : ''), [tabUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tab = await getActiveTab();
      if (cancelled) return;
      setTabUrl(tab?.url ?? null);
      setTabId(tab?.id ?? null);
      setTabTitle(tab?.title ?? null);
      const h = tab?.url ? hostnameOf(tab.url) : '';
      if (h) setForceReadabilityState(await getForceReadabilityForDomain(h));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleForce(checked: boolean) {
    setForceReadabilityState(checked);
    if (host) await setForceReadabilityForDomain(host, checked);
  }

  async function startSubmit() {
    if (!tabUrl || tabId == null) return;

    chrome.runtime.sendMessage({ type: 'SUBMIT_START' });

    let final: SubmitState | null = null;
    try {
      final = await runSubmit(
        {
          scrape,
          submitArticle,
          extract: extractFromTab,
          onState: setState,
        },
        { tabId, url: tabUrl, forceReadability },
      );
    } catch (err) {
      if ((err as { name?: string })?.name === 'UnauthorizedError') {
        chrome.runtime.sendMessage({ type: 'SUBMIT_END', ok: false });
        onUnauthorized();
        return;
      }
      setState({
        kind: 'error',
        message: 'Unexpected error. Try again.',
        retryable: true,
        stage: 'unknown',
      });
    }

    const ok = final?.kind === 'success' || final?.kind === 'duplicate';
    chrome.runtime.sendMessage({ type: 'SUBMIT_END', ok });
  }

  const inFlight =
    state.kind === 'starting' ||
    state.kind === 'scraping' ||
    state.kind === 'extracting' ||
    state.kind === 'submitting_extracted';

  const tabUnsupported = !tabUrl || /^chrome(-extension)?:/.test(tabUrl) || tabUrl.startsWith('about:');

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Active tab</p>
        <p className="truncate text-sm text-gray-900 dark:text-gray-100" title={tabTitle ?? tabUrl ?? ''}>
          {tabTitle ?? tabUrl ?? 'No active tab'}
        </p>
        {host && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{host}</p>}
      </div>

      <button
        type="button"
        onClick={startSubmit}
        disabled={inFlight || tabUnsupported}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 transition-colors motion-reduce:transition-none"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {inFlight ? 'Submitting…' : 'Submit this article'}
      </button>

      {tabUnsupported && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The extension can't submit Chrome's internal pages. Open an article and try again.
        </p>
      )}

      <label
        htmlFor="force-readability"
        className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 cursor-pointer focus-within:ring-2 focus-within:ring-orange-500"
      >
        <input
          id="force-readability"
          type="checkbox"
          checked={forceReadability}
          onChange={(e) => handleToggleForce(e.target.checked)}
          aria-describedby="force-readability-help"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
        />
        <span className="text-xs leading-snug">
          <span className="block font-medium text-gray-800 dark:text-gray-200">
            Skip server scrape (use this tab's content)
          </span>
          <span id="force-readability-help" className="block text-gray-600 dark:text-gray-400">
            Useful for paywalled sites where you're already signed in.
            {host && forceReadability && (
              <> Persisted for <span className="font-medium">{host}</span>.</>
            )}
          </span>
        </span>
      </label>

      <StatusPanel state={state} onRetry={startSubmit} pageUrl={tabUrl} />

      <RecentSubmissions onUnauthorized={onUnauthorized} />
    </div>
  );
}
