/**
 * Playwright Scraper Service
 *
 * Local HTTP API for scraping websites that block standard requests.
 * Runs headless Chromium for full JavaScript rendering.
 *
 * Endpoints:
 * - POST /scrape - Scrape a single URL
 * - POST /scrape-links - Get article links from an index page
 * - GET /health - Health check
 */

const express = require('express');
const { chromium } = require('playwright');
const TurndownService = require('turndown');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3002;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '3', 10);
const DEFAULT_TIMEOUT = 30000;

// Concurrency control
let activeRequests = 0;
const requestQueue = [];

// Turndown for HTML to Markdown conversion
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Remove unwanted elements
turndown.remove(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']);

/**
 * Queue management for concurrent requests
 */
function enqueue(handler) {
  return new Promise((resolve, reject) => {
    const task = { handler, resolve, reject };

    if (activeRequests < MAX_CONCURRENT) {
      runTask(task);
    } else {
      requestQueue.push(task);
    }
  });
}

async function runTask(task) {
  activeRequests++;
  try {
    const result = await task.handler();
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  } finally {
    activeRequests--;
    if (requestQueue.length > 0) {
      runTask(requestQueue.shift());
    }
  }
}

/**
 * Create a browser page with common settings
 */
async function createPage(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  // Block unnecessary resources for speed
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return { page, context };
}

/**
 * Extract main content from a page
 */
async function extractContent(page, contentSelector) {
  // Get page title
  const title = await page.title();

  // Get content - prefer selector if provided, otherwise try common article selectors
  let content = '';

  if (contentSelector) {
    const element = await page.$(contentSelector);
    if (element) {
      content = await element.innerHTML();
    }
  }

  // Fallback to common article selectors
  if (!content) {
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
    ];

    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        content = await element.innerHTML();
        break;
      }
    }
  }

  // Last resort: get body content
  if (!content) {
    content = await page.$eval('body', (el) => el.innerHTML);
  }

  // Convert to markdown
  const markdown = turndown.turndown(content);

  // Calculate word count
  const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;

  return { title, content: markdown, wordCount };
}

/**
 * POST /scrape - Scrape a single URL
 */
app.post('/scrape', async (req, res) => {
  const { url, waitForSelector, contentSelector, timeout = DEFAULT_TIMEOUT } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    const result = await enqueue(async () => {
      const browser = await chromium.launch({ headless: true });

      try {
        const { page, context } = await createPage(browser);

        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });

        // Wait for specific element if requested
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
            console.log(`Selector ${waitForSelector} not found, continuing...`);
          });
        }

        // Wait a bit for dynamic content
        await page.waitForTimeout(1000);

        // Extract content
        const { title, content, wordCount } = await extractContent(page, contentSelector);

        await context.close();

        return {
          success: true,
          title,
          content,
          wordCount,
          url,
        };
      } finally {
        await browser.close();
      }
    });

    res.json(result);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    res.json({
      success: false,
      error: error.message,
      url,
    });
  }
});

/**
 * POST /scrape-links - Get article links from an index page
 */
app.post('/scrape-links', async (req, res) => {
  const { url, linkSelector, linkPattern, limit = 20, timeout = DEFAULT_TIMEOUT } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  if (!linkSelector) {
    return res.status(400).json({ success: false, error: 'linkSelector is required' });
  }

  try {
    const result = await enqueue(async () => {
      const browser = await chromium.launch({ headless: true });

      try {
        const { page, context } = await createPage(browser);

        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });

        // Wait a bit for dynamic content
        await page.waitForTimeout(1000);

        // Find all links matching the selector
        const links = await page.$$eval(
          linkSelector,
          (elements, baseUrl) => {
            return elements.map((el) => {
              const href = el.href || el.getAttribute('href');
              const title = el.textContent?.trim() || el.getAttribute('title') || '';

              // Resolve relative URLs
              let fullUrl = href;
              if (href && !href.startsWith('http')) {
                try {
                  fullUrl = new URL(href, baseUrl).toString();
                } catch {
                  fullUrl = href;
                }
              }

              return { url: fullUrl, title };
            });
          },
          url
        );

        await context.close();

        // Filter by pattern if provided
        let filteredLinks = links.filter((l) => l.url);

        if (linkPattern) {
          const regex = new RegExp(linkPattern);
          filteredLinks = filteredLinks.filter((l) => regex.test(l.url));
        }

        // Deduplicate and limit
        const uniqueLinks = [...new Map(filteredLinks.map((l) => [l.url, l])).values()];
        const limitedLinks = uniqueLinks.slice(0, limit);

        return {
          success: true,
          links: limitedLinks,
          totalFound: uniqueLinks.length,
        };
      } finally {
        await browser.close();
      }
    });

    res.json(result);
  } catch (error) {
    console.error(`Error getting links from ${url}:`, error.message);
    res.json({
      success: false,
      error: error.message,
      links: [],
    });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRequests,
    queueLength: requestQueue.length,
    maxConcurrent: MAX_CONCURRENT,
  });
});

/**
 * GET / - Service info
 */
app.get('/', (req, res) => {
  res.json({
    service: 'playwright-scraper',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/scrape', description: 'Scrape a single URL' },
      { method: 'POST', path: '/scrape-links', description: 'Get article links from index page' },
      { method: 'GET', path: '/health', description: 'Health check' },
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Playwright Scraper Service running on port ${PORT}`);
  console.log(`Max concurrent requests: ${MAX_CONCURRENT}`);
});
