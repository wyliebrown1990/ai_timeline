/**
 * BlogTOC — "On this page" table of contents.
 *
 * - Parses `## h2` and `### h3` from the markdown body (pre-render, so we
 *   don't need to walk the DOM).
 * - At `lg+`: sticky sidebar with scroll-spy via IntersectionObserver.
 * - At `sm/md`: collapsible <details> above the body.
 * - Clicking a TOC item scrolls AND moves focus to the heading so keyboard +
 *   screen-reader users track along.
 * - Smooth scroll gated on `prefers-reduced-motion`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface Heading {
  level: 2 | 3;
  text: string;
  id: string;
}

function extractHeadings(markdown: string): Heading[] {
  const out: Heading[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  for (const line of lines) {
    // Skip code fences — "## " inside a snippet is not a heading.
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m && m[1] && m[2]) {
      const level = m[1].length === 2 ? 2 : 3;
      const text = m[2].trim();
      out.push({ level, text, id: slugify(text) });
    }
  }
  return out;
}

interface Props {
  markdown: string;
}

export function BlogTOC({ markdown }: Props) {
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll-spy. `-20% 0% -60% 0%` biases the active heading toward the top
  // third of the viewport, matching where a reader's eyes focus.
  useEffect(() => {
    if (headings.length === 0) return;
    const ids = headings.map((h) => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { threshold: 0.3, rootMargin: '-20% 0% -60% 0%' }
    );
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const jumpTo = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    // Make the heading focusable if it isn't already, then move focus so
    // keyboard + screen-reader users follow the jump.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  if (headings.length === 0) return null;

  const list = (
    <ul className="space-y-2 text-sm">
      {headings.map((h) => (
        <li key={h.id} className={h.level === 3 ? 'ml-4' : ''}>
          <a
            href={`#${h.id}`}
            onClick={(e) => jumpTo(e, h.id)}
            className={
              activeId === h.id
                ? 'block border-l-2 border-orange-500 pl-3 text-orange-600 dark:text-orange-400'
                : 'block border-l-2 border-transparent pl-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Mobile + tablet: collapsible at the top of the article */}
      <details className="lg:hidden mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white select-none">
          On this page
        </summary>
        <div className="mt-3">{list}</div>
      </details>

      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          On this page
        </h2>
        {list}
      </aside>
    </>
  );
}

export default BlogTOC;
