/**
 * Bibliography Ingestion Controller
 * Sprint Bib-1: Admin API endpoints for bibliography ingestion
 */

import type { Request, Response, NextFunction } from 'express';
import {
  ingestBibliography,
  generateMarkdownReport,
  testIngestion,
  type IngestionReport,
} from '../services/ingestion/bibliographyIngestion';

// Store the latest ingestion report in memory
let latestReport: IngestionReport | null = null;
let isIngestionRunning = false;
let ingestionProgress: {
  phase: string;
  current: number;
  total: number;
  message: string;
} | null = null;

/**
 * Start bibliography ingestion
 * POST /api/admin/bibliography/ingest
 */
export async function startIngestion(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      sourceUrl = 'https://www.abriefhistoryofintelligence.com/bibliography',
      dryRun = false,
      maxEntries,
      skipScraping = false,
    } = req.body;

    if (isIngestionRunning) {
      return res.status(409).json({
        error: 'Ingestion already in progress',
        progress: ingestionProgress,
      });
    }

    // Start ingestion in background
    isIngestionRunning = true;
    ingestionProgress = {
      phase: 'starting',
      current: 0,
      total: 0,
      message: 'Starting ingestion...',
    };

    // Run ingestion asynchronously
    (async () => {
      try {
        const report = await ingestBibliography({
          sourceUrl,
          dryRun,
          maxEntries,
          skipScraping,
          onProgress: (progress) => {
            ingestionProgress = progress;
          },
        });

        latestReport = report;
        console.log('[Bibliography] Ingestion completed');
      } catch (error) {
        console.error('[Bibliography] Ingestion failed:', error);
        latestReport = {
          sourceUrl,
          startedAt: new Date(),
          completedAt: new Date(),
          totalEntriesParsed: 0,
          aimlFiltered: 0,
          duplicatesSkipped: 0,
          scrapingSucceeded: 0,
          scrapingFailed: 0,
          llmGenerated: 0,
          milestonesCreated: 0,
          errors: [{ entry: 'FATAL', error: String(error) }],
          processingTimeMs: 0,
          createdMilestoneIds: [],
        };
      } finally {
        isIngestionRunning = false;
        ingestionProgress = null;
      }
    })();

    res.json({
      message: 'Ingestion started',
      status: 'running',
      dryRun,
      maxEntries: maxEntries || 'unlimited',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get ingestion status
 * GET /api/admin/bibliography/status
 */
export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({
      isRunning: isIngestionRunning,
      progress: ingestionProgress,
      hasReport: latestReport !== null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get latest ingestion report
 * GET /api/admin/bibliography/report
 */
export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const format = req.query.format as string;

    if (!latestReport) {
      return res.status(404).json({ error: 'No report available' });
    }

    if (format === 'markdown') {
      const markdown = generateMarkdownReport(latestReport);
      res.type('text/markdown').send(markdown);
    } else {
      res.json(latestReport);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel running ingestion
 * POST /api/admin/bibliography/cancel
 */
export async function cancelIngestion(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isIngestionRunning) {
      return res.status(400).json({ error: 'No ingestion in progress' });
    }

    // Note: This is a simplified cancel - in production you'd want proper cancellation tokens
    isIngestionRunning = false;
    ingestionProgress = null;

    res.json({ message: 'Ingestion cancelled' });
  } catch (error) {
    next(error);
  }
}

/**
 * Run test ingestion with limited entries
 * POST /api/admin/bibliography/test
 */
export async function runTest(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      sourceUrl = 'https://www.abriefhistoryofintelligence.com/bibliography',
      maxEntries = 5,
    } = req.body;

    if (isIngestionRunning) {
      return res.status(409).json({
        error: 'Ingestion already in progress',
      });
    }

    console.log(`[Bibliography] Running test ingestion with max ${maxEntries} entries`);

    const report = await testIngestion(sourceUrl, maxEntries);
    latestReport = report;

    res.json({
      message: 'Test completed (dry run)',
      report,
    });
  } catch (error) {
    next(error);
  }
}
