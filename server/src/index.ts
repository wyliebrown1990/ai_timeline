import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import milestonesRoutes from './routes/milestones';
import chatRoutes from './routes/chat';

/**
 * Create and configure the Express application
 */
export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, CORS_ORIGIN must be explicitly set
  if (isProduction && !corsOrigin) {
    console.error('ERROR: CORS_ORIGIN must be set in production');
    process.exit(1);
  }

  // Parse CORS origins (supports comma-separated list)
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl)
        // In production, you might want to restrict this
        if (!origin && !isProduction) {
          return callback(null, true);
        }

        if (!origin && isProduction) {
          return callback(new Error('Origin header required'), false);
        }

        if (allowedOrigins.includes(origin!)) {
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

  // API routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/milestones', milestonesRoutes);
  app.use('/api/chat', chatRoutes);

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
