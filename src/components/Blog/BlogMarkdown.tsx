/**
 * BlogMarkdown — renders a post body.
 *
 * Stack: react-markdown + remark-gfm + rehype-slug + rehype-autolink-headings +
 * rehype-pretty-code (shiki). Raw HTML is intentionally disabled — posts are
 * untrusted content and markdown alone is expressive enough for editorial.
 *
 * Entity shortcode: `[[type:slug|label]]` resolves to an internal link —
 *   [[person:sam-altman|Sam Altman]]        → /people/sam-altman
 *   [[organization:openai|OpenAI]]          → /organizations/openai
 *   [[glossary:transformer|Transformers]]   → /glossary/transformer
 *   [[event:E2017_TRANSFORMER|Attention is All You Need]] → /events/E2017_TRANSFORMER
 * Unknown types fall back to plain text so bad shortcodes never break a render.
 *
 * This file is imported via `React.lazy()` from BlogPostPage so the shiki
 * bundle doesn't land on the critical path for the blog index.
 */

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

// Fine-grained bundle: Vite statically resolves these imports and drops every
// other grammar/theme shiki ships. With the default `shiki` entry point we
// accidentally pulled in wolfram, emacs-lisp, cpp, etc. — 3MB+ of dead code.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/jsx.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/sql.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/markdown.mjs'),
      ],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  }
  return highlighterPromise;
}

// Pre-process `[[type:slug|label]]` → `[label](/path/slug)` before markdown parsing.
const ENTITY_SHORTCODE = /\[\[(person|organization|glossary|event):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
function rewriteEntityShortcodes(md: string): string {
  return md.replace(ENTITY_SHORTCODE, (_, type: string, slug: string, label: string) => {
    const href =
      type === 'person'
        ? `/people/${slug}`
        : type === 'organization'
          ? `/organizations/${slug}`
          : type === 'glossary'
            ? `/glossary/${slug}`
            : type === 'event'
              ? `/events/${slug}`
              : null;
    if (!href) return label;
    return `[${label}](${href})`;
  });
}

interface Props {
  markdown: string;
}

export function BlogMarkdown({ markdown }: Props) {
  // rehype-pretty-code needs the highlighter up front. Load it once per mount;
  // until it resolves we render the prose without syntax highlighting, which
  // degrades cleanly instead of blocking the whole article.
  const [highlighterReady, setHighlighterReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(() => {
      if (!cancelled) setHighlighterReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rehypePlugins = [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: 'append',
        properties: {
          className: ['heading-anchor'],
          'aria-label': 'Permalink',
        },
        // Screen readers get a useful label; visible anchor is the "#" glyph.
        content: { type: 'text', value: ' #' },
      },
    ],
    ...(highlighterReady
      ? [
          [
            rehypePrettyCode,
            {
              theme: SHIKI_THEMES,
              getHighlighter,
              keepBackground: false,
            },
          ],
        ]
      : []),
    // The above array's inner tuples are intentionally plugin+options;
    // TypeScript is permissive enough about PluggableList here.
  ] as unknown as Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];

  const body = rewriteEntityShortcodes(markdown);

  return (
    <div
      className="
        prose prose-neutral dark:prose-invert max-w-none
        prose-headings:scroll-mt-24
        prose-a:text-orange-600 dark:prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:rounded prose-code:px-1
        prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-img:rounded-lg prose-img:shadow-warm-sm
        prose-pre:bg-transparent prose-pre:p-0
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

export default BlogMarkdown;
