import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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
 * Uses PrismaPg adapter with Pool (required for Prisma 7.x)
 * DATABASE_URL is required - set via environment variable or SSM in Lambda
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
      'For local development, set it in .env file. ' +
      'For Lambda, it is resolved from SSM Parameter Store.'
    );
  }

  // Create PostgreSQL Pool with SSL support for RDS connections
  // Limit connections for Lambda: t3.micro has ~20 max connections
  // With multiple Lambda instances, each should use minimal connections
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: process.env.NODE_ENV === 'production' ? 2 : 10, // Limit connections in Lambda
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if can't connect
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

// Export singleton Prisma client instance
// Reuses existing instance in development to prevent connection pool exhaustion
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
