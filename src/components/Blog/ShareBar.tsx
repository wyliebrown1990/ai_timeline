/**
 * ShareBar — share + copy-link row for a single blog post.
 *
 * On mobile (when `navigator.share` is available, typically iOS/Android),
 * renders a single "Share" button that opens the native share sheet — the
 * most frictionless path for the majority of actual shares.
 *
 * Desktop and fallback mobile: explicit row of Twitter/X, LinkedIn, Email,
 * Copy-link buttons. Each button is a ≥44×44 tap target.
 *
 * Usage: <ShareBar url={postUrl} title={post.title} description={post.excerpt} />
 */

import { useState } from 'react';
import { Twitter, Linkedin, Link as LinkIcon, Mail, Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function ShareBar({ url, title, description, className }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent((description ?? '') + '\n\n' + url);

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const emailHref = `mailto:?subject=${encodedTitle}&body=${encodedBody}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      // Reset icon after a beat — keeps the affordance discoverable on repeat clicks.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy the URL from the address bar instead");
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator === 'undefined' || !('share' in navigator)) return;
    try {
      await navigator.share({ title, text: description, url });
    } catch (err) {
      // User cancelled is not an error worth surfacing.
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('[ShareBar] native share failed', err);
      }
    }
  };

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const base =
    'inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 min-h-[44px] text-sm transition-colors';

  return (
    <div className={className}>
      {/* Native share button — visible only on small screens that support it */}
      {hasNativeShare && (
        <button
          type="button"
          onClick={() => void onNativeShare()}
          className={`md:hidden w-full justify-center ${base}`}
          aria-label="Share this post"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      )}

      {/* Explicit channels — always visible on md+, fallback on small when no native share */}
      <div
        className={`${hasNativeShare ? 'hidden md:flex' : 'flex'} flex-wrap items-center gap-2`}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
          Share:
        </span>
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          aria-label="Share on Twitter"
        >
          <Twitter className="h-4 w-4" />
          Twitter
        </a>
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </a>
        <a
          href={emailHref}
          className={base}
          aria-label="Share by email"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
        <button
          type="button"
          onClick={() => void onCopy()}
          className={base}
          aria-label="Copy link to clipboard"
        >
          {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

export default ShareBar;
