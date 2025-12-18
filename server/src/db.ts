import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

/**
 * Prisma client singleton for database operations
 * Note: SQLite/better-sqlite3 doesn't work in Lambda
 * Database features are disabled in Lambda environment
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

function createPrismaClient(): PrismaClient | null {
  // Skip database initialization in Lambda (SQLite doesn't work there)
  if (IS_LAMBDA) {
    console.warn('Database disabled in Lambda environment');
    return null;
  }

  try {
    // Only import sqlite adapter when not in Lambda
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

    // Database is in project root
    const dbPath = resolve(process.cwd(), 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
