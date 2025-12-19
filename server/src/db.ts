import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton for database operations
 * Connects to PostgreSQL via DATABASE_URL environment variable
 * Works in both local development and Lambda (with RDS) environments
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a new Prisma client instance configured for PostgreSQL
 * DATABASE_URL is required - set via environment variable or SSM in Lambda
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
      'For local development, set it in .env file. ' +
      'For Lambda, it is resolved from SSM Parameter Store.'
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

// Export singleton Prisma client instance
// Reuses existing instance in development to prevent connection pool exhaustion
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
