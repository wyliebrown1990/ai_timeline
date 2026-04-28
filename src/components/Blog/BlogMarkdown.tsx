/**
 * BlogMarkdown — renders a post body.
 *
 * Stack: react-markdown + remark-gfm. Raw HTML is intentionally disabled —
 * posts are untrusted content and markdown alone is expressive enough for
 * editorial.
 *
 * Entity shortcode: `[[type:slug|label]]` resolves to an internal link —
 *   [[person:sam-altman|Sam Altman]]        → /people/sam-altman
 *   [[organization:openai|OpenAI]]          → /organizations/openai
 *   [[glossary:transformer|Transformers]]   → /glossary/transformer
 *   [[event:E2017_TRANSFORMER|Attention is All You Need]] → /events/E2017_TRANSFORMER
 * Unknown types fall back to plain text so bad shortcodes never break a render.
 *
 * Heading hierarchy: the page already renders `post.title` as `<h1>`, so body
 * `#` is demoted to `<h2>`, `##` to `<h3>`, etc. — enforced via the `components`
 * prop below so authors can't accidentally ship a dual-h1 page.
 *
 * Heading ids + anchor links: we assign `id`s inside the component instead of
 * via `rehype-slug` / `rehype-autolink-headings`. Every rehype plugin we tried
 * made react-markdown v10 log a non-fatal `runSync finished async` error —
 * react-markdown v10 is internally async but enters a sync path. Keeping the
 * plugin surface minimal keeps the page visibly clean.
 *
 * Code highlighting: out of scope for v1. Shiki via `rehype-pretty-code` is
 * async and crashes react-markdown's `runSync`. A follow-up will revisit
 * either via server-side pre-render during publish or a different renderer.
 *
 * This file is imported via `React.lazy()` from BlogPostPage so the plugin
 * chain doesn't land on the critical path for the blog index.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EntityPreviewLink } from './EntityPreviewLink';
import { parseEntityHref } from './parseEntityHref';
// NOTE: rehype-autolink-headings was removed — it triggered a non-fatal
// "runSync finished async" log in react-markdown v10. rehype-slug alone
// still gives each heading an `id`, and we can render the visible "#"
// anchor through the heading component overrides below without touching
// the async plugin surface.

/**
 * Defensive heading-level renderer. BlogPostPage always renders the post
 * title as `<h1>`, so any body `# heading` must render as `<h2>` (and so on)
 * to avoid a duplicate-h1 DOM — which trips the sprint-DoD integrity check
 * and hurts both a11y and SEO.
 *
 * We override via react-markdown's `components` prop rather than a remark
 * plugin because remark/rehype async plugins don't compose with react-markdown's
 * `runSync` pipeline (learned the hard way during Blog-2 QA).
 */
type HProps = React.HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown;
  id?: string;
  children?: React.ReactNode;
};
function omitNode<T extends { node?: unknown }>(p: T): Omit<T, 'node'> {
  const { node: _node, ...rest } = p;
  return rest;
}

/** Slugify the rendered heading text so the TOC in BlogTOC.tsx finds it by id. */
function slugifyChildren(children: React.ReactNode): string {
  const flatten = (node: React.ReactNode): string => {
    if (node == null || node === false) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(flatten).join('');
    return '';
  };
  return flatten(children)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function HeadingAnchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Permalink"
      className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 no-underline"
    >
      #
    </a>
  );
}

// Anchor renderer: route in-app entity hrefs through EntityPreviewLink so they
// open a hover/long-press preview card. All other anchors (external links,
// non-entity internal links) pass through as plain <a>.
type AProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown;
  href?: string;
};
function MarkdownAnchor({ node: _node, href, children, ...rest }: AProps) {
  if (href && parseEntityHref(href)) {
    return (
      <EntityPreviewLink href={href} {...rest}>
        {children}
      </EntityPreviewLink>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

// `#` body heading becomes `<h2>`, etc. — prevents duplicate-h1 with the page
// title. Headings self-slugify so BlogTOC's id-based scroll-spy keeps working
// without pulling in rehype-slug (the async plugin that triggered runSync warnings).
const markdownComponents = {
  a: MarkdownAnchor,
  h1: (props: HProps) => {
    const id = props.id ?? slugifyChildren(props.children);
    return (
      <h2 {...omitNode(props)} id={id} className="group">
        {props.children}
        <HeadingAnchor id={id} />
      </h2>
    );
  },
  h2: (props: HProps) => {
    const id = props.id ?? slugifyChildren(props.children);
    return (
      <h3 {...omitNode(props)} id={id} className="group">
        {props.children}
        <HeadingAnchor id={id} />
      </h3>
    );
  },
  h3: (props: HProps) => {
    const id = props.id ?? slugifyChildren(props.children);
    return (
      <h4 {...omitNode(props)} id={id} className="group">
        {props.children}
        <HeadingAnchor id={id} />
      </h4>
    );
  },
  h4: (props: HProps) => {
    const id = props.id ?? slugifyChildren(props.children);
    return (
      <h5 {...omitNode(props)} id={id} className="group">
        {props.children}
        <HeadingAnchor id={id} />
      </h5>
    );
  },
  h5: (props: HProps) => {
    const id = props.id ?? slugifyChildren(props.children);
    return (
      <h6 {...omitNode(props)} id={id} className="group">
        {props.children}
        <HeadingAnchor id={id} />
      </h6>
    );
  },
};

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
  const body = rewriteEntityShortcodes(markdown);

  return (
    <div
      className="
        prose prose-neutral dark:prose-invert max-w-none
        prose-headings:scroll-mt-24
        prose-a:text-orange-600 dark:prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:rounded prose-code:px-1
        prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100
        prose-img:rounded-lg prose-img:shadow-warm-sm
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

export default BlogMarkdown;
