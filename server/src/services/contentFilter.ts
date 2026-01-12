/**
 * Content Filter Service (Sprint Spam-1)
 *
 * Filters comment content for spam indicators:
 * - Excessive URLs
 * - Blocked domains
 * - Blocked keywords
 * - Regex patterns
 */

import { prisma } from '../db';

// =============================================================================
// Configuration
// =============================================================================

const MAX_URLS_PER_COMMENT = 2;

// URL regex pattern
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Domain extraction regex
const DOMAIN_REGEX = /https?:\/\/(?:www\.)?([^\/\s]+)/i;

// =============================================================================
// Types
// =============================================================================

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  triggeredFilter?: {
    id: string;
    filterType: string;
    pattern: string;
  };
}

// =============================================================================
// Main Filter Functions
// =============================================================================

/**
 * Filter comment content for spam
 * Returns whether the content is allowed and reason if not
 */
export async function filterComment(content: string): Promise<FilterResult> {
  // Check URL count
  const urlCheck = checkUrlCount(content);
  if (!urlCheck.allowed) {
    return urlCheck;
  }

  // Check against spam filters in database
  const filterCheck = await checkSpamFilters(content);
  if (!filterCheck.allowed) {
    return filterCheck;
  }

  return { allowed: true };
}

/**
 * Check if comment has too many URLs
 */
export function checkUrlCount(content: string): FilterResult {
  const urls = extractUrls(content);

  if (urls.length > MAX_URLS_PER_COMMENT) {
    return {
      allowed: false,
      reason: `Comments can contain at most ${MAX_URLS_PER_COMMENT} links. Your comment has ${urls.length}.`,
    };
  }

  return { allowed: true };
}

/**
 * Check content against database spam filters
 */
export async function checkSpamFilters(content: string): Promise<FilterResult> {
  // Get all active filters
  const filters = await prisma.spamFilter.findMany({
    where: { isActive: true },
  });

  const contentLower = content.toLowerCase();
  const domains = extractDomains(content);

  for (const filter of filters) {
    let matched = false;

    switch (filter.filterType) {
      case 'blocked_domain':
        // Check if any URL in content matches blocked domain
        matched = domains.some(
          (domain) => domain.toLowerCase() === filter.pattern.toLowerCase()
        );
        break;

      case 'blocked_keyword':
        // Simple keyword match (case-insensitive)
        matched = contentLower.includes(filter.pattern.toLowerCase());
        break;

      case 'regex':
        // Regex pattern match
        try {
          const regex = new RegExp(filter.pattern, 'i');
          matched = regex.test(content);
        } catch {
          // Invalid regex - skip this filter
          console.warn(`Invalid regex pattern in filter ${filter.id}: ${filter.pattern}`);
        }
        break;
    }

    if (matched) {
      // Increment hit count
      await prisma.spamFilter.update({
        where: { id: filter.id },
        data: { hitCount: { increment: 1 } },
      });

      // Return result based on action
      if (filter.action === 'block') {
        return {
          allowed: false,
          reason: getBlockReason(filter.filterType),
          triggeredFilter: {
            id: filter.id,
            filterType: filter.filterType,
            pattern: filter.pattern,
          },
        };
      }

      // If action is 'flag_review', we allow but flag (handled by caller)
      // For now, just allow it through
    }
  }

  return { allowed: true };
}

// =============================================================================
// URL/Domain Helpers
// =============================================================================

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Extract domains from URLs in text
 */
export function extractDomains(text: string): string[] {
  const urls = extractUrls(text);
  const domains: string[] = [];

  for (const url of urls) {
    const match = url.match(DOMAIN_REGEX);
    if (match && match[1]) {
      domains.push(match[1]);
    }
  }

  return domains;
}

/**
 * Check if a specific domain is blocked
 */
export async function isDomainBlocked(domain: string): Promise<boolean> {
  const filter = await prisma.spamFilter.findFirst({
    where: {
      filterType: 'blocked_domain',
      pattern: domain.toLowerCase(),
      isActive: true,
    },
  });

  return !!filter;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user-friendly block reason based on filter type
 */
function getBlockReason(filterType: string): string {
  switch (filterType) {
    case 'blocked_domain':
      return 'Your comment contains a link to a blocked website.';
    case 'blocked_keyword':
      return 'Your comment contains content that is not allowed.';
    case 'regex':
      return 'Your comment contains content that is not allowed.';
    default:
      return 'Your comment was blocked by our spam filter.';
  }
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Get all spam filters with stats
 */
export async function getAllFilters() {
  return prisma.spamFilter.findMany({
    orderBy: [{ isActive: 'desc' }, { hitCount: 'desc' }],
  });
}

/**
 * Create a new spam filter
 */
export async function createFilter(data: {
  filterType: string;
  pattern: string;
  action: string;
}) {
  // Validate filter type
  if (!['blocked_domain', 'blocked_keyword', 'regex'].includes(data.filterType)) {
    throw new Error('Invalid filter type');
  }

  // Validate action
  if (!['block', 'flag_review'].includes(data.action)) {
    throw new Error('Invalid action');
  }

  // Validate regex if applicable
  if (data.filterType === 'regex') {
    try {
      new RegExp(data.pattern);
    } catch {
      throw new Error('Invalid regex pattern');
    }
  }

  return prisma.spamFilter.create({
    data: {
      filterType: data.filterType,
      pattern: data.pattern,
      action: data.action,
    },
  });
}

/**
 * Update a spam filter
 */
export async function updateFilter(
  id: string,
  data: {
    pattern?: string;
    action?: string;
    isActive?: boolean;
  }
) {
  const filter = await prisma.spamFilter.findUnique({ where: { id } });
  if (!filter) {
    throw new Error('Filter not found');
  }

  // Validate regex if updating pattern on regex filter
  if (data.pattern && filter.filterType === 'regex') {
    try {
      new RegExp(data.pattern);
    } catch {
      throw new Error('Invalid regex pattern');
    }
  }

  return prisma.spamFilter.update({
    where: { id },
    data,
  });
}

/**
 * Delete a spam filter
 */
export async function deleteFilter(id: string) {
  return prisma.spamFilter.delete({ where: { id } });
}
