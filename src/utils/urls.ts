/**
 * URL Helper Utilities
 *
 * Sprint SEO-7: Centralized URL generation for SEO-friendly links
 * Ensures consistent use of slug-based URLs across the application
 */

/**
 * Generate SEO-friendly URL for a glossary term
 * Prefers slug-based URL, falls back to query param for terms without slugs
 */
export function getGlossaryUrl(term: { id: string; slug?: string | null }): string {
  return term.slug ? `/glossary/${term.slug}` : `/glossary?term=${term.id}`;
}

/**
 * Generate SEO-friendly URL for a person profile
 */
export function getPersonUrl(person: { slug: string }): string {
  return `/people/${person.slug}`;
}

/**
 * Generate SEO-friendly URL for an organization profile
 */
export function getOrganizationUrl(org: { slug: string }): string {
  return `/organizations/${org.slug}`;
}

/**
 * Generate URL for a milestone/event
 */
export function getMilestoneUrl(milestone: { id: string }): string {
  return `/events/${milestone.id}`;
}

/**
 * Generate URL for timeline with milestone focused
 */
export function getTimelineMilestoneUrl(milestoneId: string): string {
  return `/timeline?milestone=${milestoneId}`;
}

/**
 * Generate URL for "X Explained" page
 */
export function getExplainedUrl(term: { slug?: string | null; id: string }): string {
  return term.slug ? `/explained/${term.slug}` : `/glossary?term=${term.id}`;
}

/**
 * Generate URL for "Who Invented X" page
 */
export function getWhoInventedUrl(term: { slug?: string | null; id: string }): string {
  return term.slug ? `/who-invented/${term.slug}` : `/glossary?term=${term.id}`;
}
