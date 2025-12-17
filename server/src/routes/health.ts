import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

/**
 * Health check response structure
 */
interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
}

/**
 * GET /api/health
 * Health check endpoint for monitoring server status
 */
router.get('/', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(response);
});

export default router;
