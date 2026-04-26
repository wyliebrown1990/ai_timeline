import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, ClipboardCopy, ExternalLink, Inbox } from 'lucide-react';
import type { SubmitState } from '../lib/submit';

const ADMIN_BASE = 'https://letaiexplainai.com/admin';

interface Props {
  state: SubmitState;
  onRetry: () => void;
  pageUrl: string | null;
}

export function StatusPanel({ state, onRetry, pageUrl }: Props) {
  if (state.kind === 'idle') return null;

  if (state.kind === 'starting' || state.kind === 'scraping') {
    return <SkeletonRow label="Trying server-side scrape…" />;
  }
  if (state.kind === 'extracting') {
    return <SkeletonRow label="Server can't reach this site — extracting from this tab…" />;
  }
  if (state.kind === 'submitting_extracted') {
    return <SkeletonRow label="Submitting extracted text…" />;
  }

  if (state.kind === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-300 bg-green-50 px-3 py-3 dark:border-green-900 dark:bg-green-950/40"
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-700 dark:text-green-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">Submitted — analyzing</p>
            {state.title && (
              <p className="mt-0.5 truncate text-xs text-green-700/80 dark:text-green-300/80" title={state.title}>
                {state.title}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-green-700/70 dark:text-green-300/70">
              via {state.via === 'scrape' ? 'server scrape' : 'Readability fallback'}
            </p>
            <a
              href={`${ADMIN_BASE}/articles/${state.articleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-800 underline-offset-2 hover:underline dark:text-green-200 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
            >
              View in admin <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'duplicate') {
    return (
      <div
        role="status"
        className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-3 dark:border-orange-900 dark:bg-orange-950/40"
      >
        <div className="flex items-start gap-2">
          <Inbox className="h-5 w-5 flex-shrink-0 text-orange-700 dark:text-orange-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">Already submitted</p>
            <p className="mt-0.5 text-xs text-orange-700/80 dark:text-orange-300/80">
              This URL is already in the queue.
            </p>
            <a
              href={`${ADMIN_BASE}/articles/${state.existingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-800 underline-offset-2 hover:underline dark:text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
            >
              View existing entry <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // error
  return <ErrorBlock state={state} onRetry={onRetry} pageUrl={pageUrl} />;
}

function ErrorBlock({
  state,
  onRetry,
  pageUrl,
}: {
  state: Extract<SubmitState, { kind: 'error' }>;
  onRetry: () => void;
  pageUrl: string | null;
}) {
  const showPasteHelper = state.stage === 'extract' && !state.retryable && pageUrl;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-3 py-3 dark:border-red-900 dark:bg-red-950/40"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-700 dark:text-red-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">Submission failed</p>
          <p className="mt-0.5 text-xs text-red-700/90 dark:text-red-300/90">{state.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.retryable && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Try again
              </button>
            )}
            {showPasteHelper && pageUrl && <PasteHelperButtons pageUrl={pageUrl} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function PasteHelperButtons({ pageUrl }: { pageUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(pageUrl);
            setCopied(true);
            toast.success('URL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error('Could not copy URL');
          }
        }}
        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
        {copied ? 'Copied' : 'Copy URL'}
      </button>
      <a
        href={`${ADMIN_BASE}/submit-article`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Open paste form
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </>
  );
}

function SkeletonRow({ label }: { label: string }) {
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}
