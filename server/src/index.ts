import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestLogger } from './middleware/requestLogger';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import milestonesRoutes from './routes/milestones';
import chatRoutes from './routes/chat';
import sourcesRoutes from './routes/sources';
import articlesRoutes from './routes/articles';
import reviewRoutes from './routes/review';
import glossaryRoutes, { adminRouter as glossaryAdminRoutes } from './routes/glossary';
import pipelineRoutes from './routes/pipeline';
import {
  flashcardRouter,
  deckRouter,
  adminFlashcardRouter,
  adminDeckRouter,
} from './routes/flashcard';
import migrationsRouter from './routes/migrations';
import learningPathsRouter, { adminRouter as learningPathsAdminRouter } from './routes/learningPaths';
import checkpointsRouter, { adminRouter as checkpointsAdminRouter } from './routes/checkpoints';
import currentEventsRouter, { adminRouter as currentEventsAdminRouter } from './routes/currentEvents';
import userSessionRouter from './routes/userSession'; // Sprint 38 - User Data Migration
import userFlashcardsRouter from './routes/userFlashcards'; // Sprint 38 - User Flashcards
import userProgressRouter from './routes/userProgress'; // Sprint 38 - User Progress
import sitemapRouter from './routes/sitemap'; // Dynamic sitemap for SEO
import keyFiguresRouter, {
  adminRouter as keyFiguresAdminRouter,
  milestoneContributorRouter,
  adminMilestoneContributorRouter,
} from './routes/keyFigures'; // Sprint 45 - Key Figures
import keyFigureDraftsRouter from './routes/keyFigureDrafts'; // Sprint 46 - Key Figure Drafts
import searchRouter from './routes/search'; // Sprint 47 - Global Search

/**
 * Create and configure the Express application
 */
export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN;

  // Parse CORS origins (supports comma-separated list, or '*' for all)
  const allowedOrigins = corsOrigin === '*'
    ? null // Allow all origins
    : corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all origins if configured with '*'
        if (allowedOrigins === null) {
          return callback(null, true);
        }

        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging for CloudWatch
  app.use(requestLogger);

  // API routes
  app.use('/api/sitemap.xml', sitemapRouter); // Dynamic sitemap (no auth)
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/milestones', milestonesRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/glossary', glossaryRoutes); // Public glossary API
  app.use('/api/flashcards', flashcardRouter); // Public flashcard API (Sprint 36)
  app.use('/api/decks', deckRouter); // Public deck API (Sprint 36)
  app.use('/api/learning-paths', learningPathsRouter); // Public learning paths API (Sprint 37)
  app.use('/api/checkpoints', checkpointsRouter); // Public checkpoints API (Sprint 37)
  app.use('/api/current-events', currentEventsRouter); // Public current events API (Sprint 37)
  app.use('/api/user', userSessionRouter); // User session management API (Sprint 38)
  app.use('/api/user', userFlashcardsRouter); // User flashcards API (Sprint 38)
  app.use('/api/user', userProgressRouter); // User progress API (Sprint 38)
  app.use('/api/key-figures', keyFiguresRouter); // Public key figures API (Sprint 45)
  app.use('/api/milestones', milestoneContributorRouter); // Milestone contributors (Sprint 45)
  app.use('/api/search', searchRouter); // Global search API (Sprint 47)
  app.use('/api/admin', sourcesRoutes);
  app.use('/api/admin/articles', articlesRoutes);
  app.use('/api/admin/review', reviewRoutes);
  app.use('/api/admin/glossary', glossaryAdminRoutes); // Admin glossary API
  app.use('/api/admin/flashcards', adminFlashcardRouter); // Admin flashcard API (Sprint 36)
  app.use('/api/admin/decks', adminDeckRouter); // Admin deck API (Sprint 36)
  app.use('/api/admin/learning-paths', learningPathsAdminRouter); // Admin learning paths API (Sprint 37)
  app.use('/api/admin/checkpoints', checkpointsAdminRouter); // Admin checkpoints API (Sprint 37)
  app.use('/api/admin/current-events', currentEventsAdminRouter); // Admin current events API (Sprint 37)
  app.use('/api/admin/key-figures', keyFiguresAdminRouter); // Admin key figures API (Sprint 45)
  app.use('/api/admin/key-figure-drafts', keyFigureDraftsRouter); // Admin key figure drafts API (Sprint 46)
  app.use('/api/admin/milestones', adminMilestoneContributorRouter); // Admin milestone contributors (Sprint 45)
  app.use('/api/admin/migrations', migrationsRouter); // Database migrations (Sprint 36)
  app.use('/api/admin/pipeline', pipelineRoutes); // Pipeline monitoring

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Start server if run directly
const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
