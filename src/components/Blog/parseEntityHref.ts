import type { EntityType } from '../../hooks/useEntityPreview';

// Maps blog-post entity hrefs (produced by `rewriteEntityShortcodes` in BlogMarkdown)
// onto the four supported entity types. Any href that doesn't match returns null
// so the markdown anchor falls back to a plain <a>.
export function parseEntityHref(
  href: string | undefined
): { type: EntityType; slug: string } | null {
  if (!href || typeof href !== 'string') return null;
  if (href.startsWith('/people/')) {
    const slug = href.slice('/people/'.length);
    return slug ? { type: 'person', slug } : null;
  }
  if (href.startsWith('/organizations/')) {
    const slug = href.slice('/organizations/'.length);
    return slug ? { type: 'organization', slug } : null;
  }
  if (href.startsWith('/glossary/')) {
    const slug = href.slice('/glossary/'.length);
    return slug ? { type: 'glossary', slug } : null;
  }
  if (href.startsWith('/events/')) {
    const slug = href.slice('/events/'.length);
    return slug ? { type: 'milestone', slug } : null;
  }
  if (href.startsWith('/subjects/')) {
    const slug = href.slice('/subjects/'.length);
    return slug ? { type: 'subject', slug } : null;
  }
  return null;
}
