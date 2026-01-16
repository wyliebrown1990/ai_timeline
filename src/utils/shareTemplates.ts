/**
 * Share Templates Utility (Sprint Feed-5)
 *
 * Generates platform-specific share text and URLs for news items.
 */

import type { FeedItem } from '../types/feed';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://letaiexplainai.com';

/**
 * Generate a shareable URL for a news event
 */
export function generateShareUrl(eventId: string): string {
  return `${BASE_URL}/news/${eventId}`;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trim() + '…';
}

/**
 * Generate share text for Twitter/X (280 char limit)
 */
export function generateTwitterText(event: FeedItem): string {
  const suffix = '\n\nvia AI Timeline';
  const urlLength = 23; // Twitter's t.co wraps all URLs to ~23 chars
  const availableChars = 280 - urlLength - suffix.length - 2; // 2 for newlines

  let text = truncate(event.headline, availableChars);

  // Add summary if there's room
  const summarySpace = availableChars - text.length - 2;
  if (summarySpace > 50 && event.summary) {
    const shortSummary = truncate(event.summary, summarySpace);
    text += '\n\n' + shortSummary;
  }

  return text + suffix;
}

/**
 * Generate share text for LinkedIn (more professional tone)
 */
export function generateLinkedInText(event: FeedItem): string {
  const url = generateShareUrl(event.id);
  const hashtags = '#AI #ArtificialIntelligence #TechNews';

  let text = `📰 AI News: ${event.headline}\n\n`;
  text += `${truncate(event.summary, 500)}\n\n`;

  if (event.whyItMatters) {
    // Get first sentence of why it matters
    const firstSentence = event.whyItMatters.split(/[.!?]/)[0];
    if (firstSentence) {
      text += `Why this matters: ${firstSentence}.\n\n`;
    }
  }

  text += `Read more and explore the context: ${url}\n\n`;
  text += hashtags;

  return text;
}

/**
 * Generate share text for generic/email use
 */
export function generateGenericText(event: FeedItem): string {
  const url = generateShareUrl(event.id);

  let text = `I thought you'd find this interesting:\n\n`;
  text += `${event.headline}\n\n`;
  text += `${event.summary}\n\n`;

  if (event.whyItMatters) {
    text += `Why it matters: ${truncate(event.whyItMatters, 300)}\n\n`;
  }

  text += `Read more: ${url}`;

  return text;
}

/**
 * Generate email subject line
 */
export function generateEmailSubject(event: FeedItem): string {
  return `AI News: ${truncate(event.headline, 60)}`;
}

/**
 * Platform-specific share URLs
 */
export const shareUrls = {
  twitter: (text: string, url: string): string =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,

  linkedin: (url: string): string =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,

  facebook: (url: string, text: string): string =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,

  whatsapp: (text: string, url: string): string =>
    `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,

  email: (subject: string, body: string): string =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
};

/**
 * Generate full share data for a platform
 */
export function generateShareData(
  event: FeedItem,
  platform: 'twitter' | 'linkedin' | 'facebook' | 'whatsapp' | 'email' | 'copy'
): { url: string; text?: string } {
  const shareUrl = generateShareUrl(event.id);

  switch (platform) {
    case 'twitter': {
      const text = generateTwitterText(event);
      return { url: shareUrls.twitter(text, shareUrl), text };
    }
    case 'linkedin': {
      return { url: shareUrls.linkedin(shareUrl) };
    }
    case 'facebook': {
      const text = event.headline;
      return { url: shareUrls.facebook(shareUrl, text), text };
    }
    case 'whatsapp': {
      const text = `${event.headline}\n\n${truncate(event.summary, 200)}`;
      return { url: shareUrls.whatsapp(text, shareUrl), text };
    }
    case 'email': {
      const subject = generateEmailSubject(event);
      const body = generateGenericText(event);
      return { url: shareUrls.email(subject, body), text: body };
    }
    case 'copy': {
      return { url: shareUrl, text: shareUrl };
    }
    default:
      return { url: shareUrl };
  }
}
