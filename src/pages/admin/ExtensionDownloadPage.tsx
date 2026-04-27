import { useEffect, useState } from 'react';
import { Download, Puzzle, AlertCircle, ExternalLink } from 'lucide-react';

interface ExtensionMeta {
  version: string;
  extensionId?: string;
  builtAt: string;
  sizeBytes: number;
  filename: string;
}

const ZIP_URL = '/ai-timeline-extension.zip';
const META_URL = '/ai-timeline-extension.json';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBuiltAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ExtensionDownloadPage() {
  const [meta, setMeta] = useState<ExtensionMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${META_URL}?t=${Date.now()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);
        return res.json();
      })
      .then((data: ExtensionMeta) => setMeta(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'));
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Puzzle className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Chrome Extension</h1>
      </div>

      <p className="text-gray-600 mb-6">
        Download the latest build of the <strong>AI Timeline Submit</strong> Chrome extension and
        load it as an unpacked extension on any computer. The extension ID is locked, so the same
        build works against the production CORS allowlist on every machine you install it on.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Latest package</h2>
            {meta ? (
              <dl className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium text-gray-700">Version:</span>{' '}
                  <span data-testid="ext-version">{meta.version}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Size:</span>{' '}
                  {formatSize(meta.sizeBytes)}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Built:</span>{' '}
                  {formatBuiltAt(meta.builtAt)}
                </div>
                {meta.extensionId && (
                  <div className="break-all">
                    <span className="font-medium text-gray-700">Extension ID:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {meta.extensionId}
                    </code>
                  </div>
                )}
              </dl>
            ) : error ? (
              <div className="flex items-start gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Could not load extension metadata: {error}. The download may still work, or the
                  package may not have been built yet (run{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    ./scripts/build-extension-zip.sh
                  </code>
                  ).
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading…</p>
            )}
          </div>

          <a
            href={ZIP_URL}
            download
            data-testid="extension-download-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow"
          >
            <Download className="h-4 w-4" />
            Download .zip
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Install on a new computer</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>
            Click <strong>Download .zip</strong> above, then unzip the archive on the new
            computer (it should contain <code className="text-xs bg-gray-100 px-1 rounded">manifest.json</code>{' '}
            at the top level).
          </li>
          <li>
            Open Chrome and navigate to{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">chrome://extensions</code>.
          </li>
          <li>
            Toggle <strong>Developer mode</strong> on (top-right corner).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and select the unzipped folder.
          </li>
          <li>
            Pin the extension from the puzzle-piece menu in Chrome's toolbar so the{' '}
            <em>Submit this article</em> button is one click away.
          </li>
          <li>
            Click the extension icon, log in with your admin credentials, and you're done.
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Need to update later? Re-run{' '}
            <code className="text-xs bg-white px-1 rounded">./scripts/build-extension-zip.sh</code>{' '}
            and redeploy the frontend. On the target machine, click <strong>Reload</strong> on the
            extension card after replacing the unzipped folder.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExtensionDownloadPage;
