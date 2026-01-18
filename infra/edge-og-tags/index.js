'use strict';

/**
 * Lambda@Edge Origin Request function for OG meta tags
 *
 * Intercepts requests from social media crawlers to /news/:id URLs
 * and returns HTML with proper OG meta tags for link previews.
 *
 * Sprint Feed-5: Social sharing OG tags support
 */

// Social media crawler User-Agent patterns
const CRAWLER_PATTERNS = [
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /WhatsApp/i,
  /Slackbot/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Pinterest/i,
  /Googlebot/i,
  /bingbot/i,
  /Applebot/i,
];

// API endpoint (hardcoded since Lambda@Edge can't use env vars)
const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api';
const SITE_URL = 'https://letaiexplainai.com';
const DEFAULT_IMAGE = 'https://letaiexplainai.com/og-image.png';

/**
 * Check if User-Agent is a social media crawler
 */
function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Extract event ID from /news/:id path
 */
function extractEventId(uri) {
  const match = uri.match(/^\/news\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Fetch event data from API
 */
async function fetchEvent(eventId) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/news/${eventId}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`API returned ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate HTML with OG meta tags
 */
function generateOgHtml(event) {
  const title = escapeHtml(event.headline);
  const description = escapeHtml(event.summary);
  const image = event.thumbnailUrl || DEFAULT_IMAGE;
  const url = `${SITE_URL}/news/${event.id}`;
  const siteName = 'Let AI Explain AI';

  // Format date for display
  const publishedDate = new Date(event.publishedDate).toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${title} | ${siteName}</title>
  <meta name="title" content="${title} | ${siteName}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:locale" content="en_US">
  <meta property="article:published_time" content="${publishedDate}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <!-- Canonical -->
  <link rel="canonical" href="${url}">

  <!-- Redirect non-crawlers to the SPA -->
  <meta http-equiv="refresh" content="0;url=${url}">

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .source { color: #999; font-size: 14px; margin-top: 16px; }
    a { color: #f97316; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${description}</p>
    ${event.sourcePublisher ? `<p class="source">Source: ${escapeHtml(event.sourcePublisher)}</p>` : ''}
    <p><a href="${url}">View full article on Let AI Explain AI</a></p>
  </div>
</body>
</html>`;
}

/**
 * Lambda@Edge handler
 */
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const uri = request.uri;

  // Get User-Agent
  const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';

  // Check if this is a /news/:id request from a crawler
  const eventId = extractEventId(uri);

  if (eventId && isCrawler(userAgent)) {
    console.log(`Crawler detected: ${userAgent.substring(0, 50)}... for event: ${eventId}`);

    try {
      // Fetch event data
      const eventData = await fetchEvent(eventId);

      // Return HTML with OG tags
      const html = generateOgHtml(eventData);

      return {
        status: '200',
        statusDescription: 'OK',
        headers: {
          'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
          'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=300' }],
        },
        body: html,
      };
    } catch (error) {
      console.error('Error fetching event:', error.message);
      // On error, let the request pass through to the origin
      return request;
    }
  }

  // For non-crawler requests or non-news paths, pass through to origin
  return request;
};
