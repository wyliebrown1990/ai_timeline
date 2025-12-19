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
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/milestones', milestonesRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/glossary', glossaryRoutes); // Public glossary API
  app.use('/api/admin', sourcesRoutes);
  app.use('/api/admin/articles', articlesRoutes);
  app.use('/api/admin/review', reviewRoutes);
  app.use('/api/admin/glossary', glossaryAdminRoutes); // Admin glossary API
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
