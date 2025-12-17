import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error';
import healthRoutes from './routes/health';
import milestonesRoutes from './routes/milestones';
import chatRoutes from './routes/chat';

/**
 * Create and configure the Express application
 */
export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration - allow frontend origins
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api/health', healthRoutes);
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
