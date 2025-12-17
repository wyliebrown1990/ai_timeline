import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Custom API error class for consistent error responses
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }

  static notFound(message: string = 'Resource not found') {
    return new ApiError(404, message);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, message);
  }
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: {
    message: string;
    code: number;
    details?: unknown;
  };
}

/**
 * Handle 404 not found errors for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.path} not found`));
}

/**
 * Global error handler middleware
 * Formats all errors into consistent API response structure
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: {
        message: 'Validation error',
        code: 400,
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    const response: ErrorResponse = {
      error: {
        message: err.message,
        code: err.statusCode,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  console.error('Unexpected error:', err);
  const response: ErrorResponse = {
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 500,
    },
  };
  res.status(500).json(response);
}
