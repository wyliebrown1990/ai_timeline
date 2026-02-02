'use strict';

/**
 * Lambda@Edge Viewer Request function for OG meta tags and 404 handling
 *
 * Intercepts requests from social media crawlers to dynamic URLs
 * and returns HTML with proper OG meta tags for link previews.
 * Also returns proper 404 status for non-existent resources.
 *
 * Sprint Feed-5: Social sharing OG tags support
 * Sprint SEO: Proper 404 handling for soft 404 fix
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
 * Extract ID from path patterns
 */
function extractNewsId(uri) {
  const match = uri.match(/^\/news\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}

function extractGlossarySlug(uri) {
  const match = uri.match(/^\/glossary\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Generic fetch with timeout
 */
async function fetchWithTimeout(url, timeoutMs = 4000) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({ status: 200, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else if (res.statusCode === 404) {
          resolve({ status: 404, data: null });
        } else {
          reject(new Error(`API returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
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
 * Generate 404 HTML response
 */
function generate404Html(type, identifier) {
  const typeLabel = type === 'news' ? 'News Article' : 'Glossary Term';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${typeLabel} Not Found | Let AI Explain AI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
      background: #f5f5f5;
    }
    h1 { color: #333; font-size: 28px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    a { color: #f97316; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #f97316;
      color: white;
      border-radius: 8px;
      text-decoration: none;
      margin: 8px;
    }
    .btn:hover { background: #ea580c; text-decoration: none; }
  </style>
</head>
<body>
  <h1>${typeLabel} Not Found</h1>
  <p>The ${typeLabel.toLowerCase()} "${escapeHtml(identifier)}" does not exist or has been removed.</p>
  <div>
    <a href="${SITE_URL}/${type === 'news' ? 'feed' : 'glossary'}" class="btn">
      Browse ${type === 'news' ? 'AI News' : 'AI Glossary'}
    </a>
    <a href="${SITE_URL}/" class="btn">
      Go to Timeline
    </a>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML with OG meta tags for news
 */
function generateNewsOgHtml(event) {
  const title = escapeHtml(event.headline);
  const description = escapeHtml(event.summary);
  const image = event.thumbnailUrl || DEFAULT_IMAGE;
  const url = `${SITE_URL}/news/${event.id}`;
  const siteName = 'Let AI Explain AI';
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
 * Generate HTML with OG meta tags for glossary terms
 */
function generateGlossaryOgHtml(term) {
  const title = escapeHtml(term.term);
  const description = escapeHtml(term.shortDefinition || term.quickAnswer);
  const url = `${SITE_URL}/glossary/${term.slug}`;
  const siteName = 'Let AI Explain AI';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${title} - AI Glossary | ${siteName}</title>
  <meta name="title" content="${title} - AI Glossary | ${siteName}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title} - AI Glossary">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${DEFAULT_IMAGE}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:locale" content="en_US">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${title} - AI Glossary">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${DEFAULT_IMAGE}">

  <!-- Canonical -->
  <link rel="canonical" href="${url}">

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
    .definition {
      background: #eff6ff;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
    }
    a { color: #f97316; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <div class="definition">
      <p>${description}</p>
    </div>
    <p><a href="${url}">Read full definition on Let AI Explain AI</a></p>
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

  // Only process crawler requests
  if (!isCrawler(userAgent)) {
    return request;
  }

  // Handle /news/:id requests
  const newsId = extractNewsId(uri);
  if (newsId) {
    console.log(`Crawler detected for news: ${newsId}`);

    try {
      const result = await fetchWithTimeout(`${API_BASE}/news/${newsId}`);

      if (result.status === 404) {
        return {
          status: '404',
          statusDescription: 'Not Found',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=300' }],
          },
          body: generate404Html('news', newsId),
        };
      }

      return {
        status: '200',
        statusDescription: 'OK',
        headers: {
          'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
          'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=300' }],
        },
        body: generateNewsOgHtml(result.data),
      };
    } catch (error) {
      console.error('Error fetching news:', error.message);
      return request;
    }
  }

  // Handle /glossary/:slug requests
  const glossarySlug = extractGlossarySlug(uri);
  if (glossarySlug) {
    console.log(`Crawler detected for glossary: ${glossarySlug}`);

    try {
      const result = await fetchWithTimeout(`${API_BASE}/glossary/slug/${glossarySlug}`);

      if (result.status === 404) {
        return {
          status: '404',
          statusDescription: 'Not Found',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=300' }],
          },
          body: generate404Html('glossary', glossarySlug),
        };
      }

      return {
        status: '200',
        statusDescription: 'OK',
        headers: {
          'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
          'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=300' }],
        },
        body: generateGlossaryOgHtml(result.data),
      };
    } catch (error) {
      console.error('Error fetching glossary term:', error.message);
      return request;
    }
  }

  // For other paths, pass through to origin
  return request;
};
