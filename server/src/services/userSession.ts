/**
 * User Session Service
 *
 * Handles database operations for user sessions and data migration.
 * Provides session management for anonymous users with device-based identification.
 *
 * Sprint 38 - User Data Migration
 */

import { prisma } from '../db';

// =============================================================================
// Types
// =============================================================================

/**
 * Session response with related stats, profile, and streak data
 */
export interface SessionResponse {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
  stats: {
    totalCards: number;
    cardsDueToday: number;
    cardsReviewedToday: number;
    currentStreak: number;
    longestStreak: number;
    masteredCards: number;
    lastStudyDate: Date | null;
  } | null;
  profile: {
    audienceType: string | null;
    expertiseLevel: string | null;
    interests: string[];
    completedOnboarding: boolean;
  } | null;
  streakHistory: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: Date | null;
    achievements: string[];
  } | null;
}

/**
 * Data structure for migrating localStorage data
 */
export interface LocalStorageMigrationData {
  flashcards?: Array<{
    sourceType: string;
    sourceId: string;
    packIds?: string[];
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: string | null;
    lastReviewedAt?: string | null;
  }>;
  packs?: Array<{
    id?: string;
    name: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
  }>;
  stats?: {
    totalCards?: number;
    cardsDueToday?: number;
    cardsReviewedToday?: number;
    currentStreak?: number;
    longestStreak?: number;
    masteredCards?: number;
    lastStudyDate?: string | null;
  };
  streakHistory?: {
    currentStreak?: number;
    longestStreak?: number;
    lastStudyDate?: string | null;
    achievements?: string[];
  };
  profile?: {
    audienceType?: string;
    expertiseLevel?: string;
    interests?: string[];
    completedOnboarding?: boolean;
  };
}

/**
 * Migration results tracking
 */
export interface MigrationResults {
  flashcards: number;
  packs: number;
  studySessions: number;
  dailyRecords: number;
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Get or create a user session by device ID.
 * Creates default stats, streak history, and profile records for new sessions.
 *
 * @param deviceId - Unique device identifier from browser
 * @returns Session with related data
 */
export async function getOrCreateSession(deviceId: string): Promise<SessionResponse> {
  // Try to find existing session
  let session = await prisma.userSession.findUnique({
    where: { deviceId },
    include: {
      stats: true,
      profile: true,
      streakHistory: true,
    },
  });

  if (session) {
    // Update last active timestamp
    session = await prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
      include: {
        stats: true,
        profile: true,
        streakHistory: true,
      },
    });
  } else {
    // Create new session with default related records
    session = await prisma.userSession.create({
      data: {
        deviceId,
        stats: {
          create: {},
        },
        streakHistory: {
          create: {},
        },
        profile: {
          create: {},
        },
      },
      include: {
        stats: true,
        profile: true,
        streakHistory: true,
      },
    });
  }

  // Transform to response format
  return {
    sessionId: session.id,
    deviceId: session.deviceId,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    stats: session.stats
      ? {
          totalCards: session.stats.totalCards,
          cardsDueToday: session.stats.cardsDueToday,
          cardsReviewedToday: session.stats.cardsReviewedToday,
          currentStreak: session.stats.currentStreak,
          longestStreak: session.stats.longestStreak,
          masteredCards: session.stats.masteredCards,
          lastStudyDate: session.stats.lastStudyDate,
        }
      : null,
    profile: session.profile
      ? {
          audienceType: session.profile.audienceType,
          expertiseLevel: session.profile.expertiseLevel,
          interests: JSON.parse(session.profile.interests) as string[],
          completedOnboarding: session.profile.completedOnboarding,
        }
      : null,
    streakHistory: session.streakHistory
      ? {
          currentStreak: session.streakHistory.currentStreak,
          longestStreak: session.streakHistory.longestStreak,
          lastStudyDate: session.streakHistory.lastStudyDate,
          achievements: JSON.parse(session.streakHistory.achievements) as string[],
        }
      : null,
  };
}

/**
 * Get session by ID.
 *
 * @param sessionId - Session ID
 * @returns Session or null if not found
 */
export async function getSessionById(sessionId: string) {
  return prisma.userSession.findUnique({
    where: { id: sessionId },
    include: {
      stats: true,
      profile: true,
      streakHistory: true,
    },
  });
}

/**
 * Validate that a session exists.
 *
 * @param sessionId - Session ID to validate
 * @returns true if session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  return session !== null;
}

// =============================================================================
// Data Migration
// =============================================================================

/**
 * Migrate localStorage data to database for a user session.
 * Handles flashcards, packs, stats, streak history, and profile.
 * Uses upsert to handle both initial migration and subsequent updates.
 *
 * @param deviceId - Device ID for the session
 * @param data - localStorage data to migrate
 * @returns Migration results with counts
 */
export async function migrateLocalStorageData(
  deviceId: string,
  data: LocalStorageMigrationData
): Promise<{ sessionId: string; results: MigrationResults }> {
  // Get or create the session
  let session = await prisma.userSession.findUnique({
    where: { deviceId },
  });

  if (!session) {
    session = await prisma.userSession.create({
      data: { deviceId },
    });
  }

  const results: MigrationResults = {
    flashcards: 0,
    packs: 0,
    studySessions: 0,
    dailyRecords: 0,
  };

  // Migrate flashcards
  if (data.flashcards && Array.isArray(data.flashcards)) {
    for (const card of data.flashcards) {
      try {
        await prisma.userFlashcard.upsert({
          where: {
            sessionId_sourceType_sourceId: {
              sessionId: session.id,
              sourceType: card.sourceType,
              sourceId: card.sourceId,
            },
          },
          update: {
            packIds: JSON.stringify(card.packIds || []),
            easeFactor: card.easeFactor ?? 2.5,
            interval: card.interval ?? 0,
            repetitions: card.repetitions ?? 0,
            nextReviewDate: card.nextReviewDate ? new Date(card.nextReviewDate) : null,
            lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
          },
          create: {
            sessionId: session.id,
            sourceType: card.sourceType,
            sourceId: card.sourceId,
            packIds: JSON.stringify(card.packIds || []),
            easeFactor: card.easeFactor ?? 2.5,
            interval: card.interval ?? 0,
            repetitions: card.repetitions ?? 0,
            nextReviewDate: card.nextReviewDate ? new Date(card.nextReviewDate) : null,
            lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
          },
        });
        results.flashcards++;
      } catch (err) {
        console.error('Error migrating flashcard:', err);
      }
    }
  }

  // Migrate packs (skip default packs)
  if (data.packs && Array.isArray(data.packs)) {
    for (const pack of data.packs) {
      if (pack.isDefault) continue;

      try {
        await prisma.userFlashcardPack.create({
          data: {
            sessionId: session.id,
            name: pack.name,
            description: pack.description ?? null,
            color: pack.color ?? '#3B82F6',
            isDefault: false,
          },
        });
        results.packs++;
      } catch (err) {
        console.error('Error migrating pack:', err);
      }
    }
  }

  // Migrate stats
  if (data.stats) {
    await prisma.userStudyStats.upsert({
      where: { sessionId: session.id },
      update: {
        totalCards: data.stats.totalCards ?? 0,
        cardsDueToday: data.stats.cardsDueToday ?? 0,
        cardsReviewedToday: data.stats.cardsReviewedToday ?? 0,
        currentStreak: data.stats.currentStreak ?? 0,
        longestStreak: data.stats.longestStreak ?? 0,
        masteredCards: data.stats.masteredCards ?? 0,
        lastStudyDate: data.stats.lastStudyDate ? new Date(data.stats.lastStudyDate) : null,
      },
      create: {
        sessionId: session.id,
        totalCards: data.stats.totalCards ?? 0,
        cardsDueToday: data.stats.cardsDueToday ?? 0,
        cardsReviewedToday: data.stats.cardsReviewedToday ?? 0,
        currentStreak: data.stats.currentStreak ?? 0,
        longestStreak: data.stats.longestStreak ?? 0,
        masteredCards: data.stats.masteredCards ?? 0,
        lastStudyDate: data.stats.lastStudyDate ? new Date(data.stats.lastStudyDate) : null,
      },
    });
  }

  // Migrate streak history
  if (data.streakHistory) {
    await prisma.userStreakHistory.upsert({
      where: { sessionId: session.id },
      update: {
        currentStreak: data.streakHistory.currentStreak ?? 0,
        longestStreak: data.streakHistory.longestStreak ?? 0,
        lastStudyDate: data.streakHistory.lastStudyDate
          ? new Date(data.streakHistory.lastStudyDate)
          : null,
        achievements: JSON.stringify(data.streakHistory.achievements ?? []),
      },
      create: {
        sessionId: session.id,
        currentStreak: data.streakHistory.currentStreak ?? 0,
        longestStreak: data.streakHistory.longestStreak ?? 0,
        lastStudyDate: data.streakHistory.lastStudyDate
          ? new Date(data.streakHistory.lastStudyDate)
          : null,
        achievements: JSON.stringify(data.streakHistory.achievements ?? []),
      },
    });
  }

  // Migrate profile
  if (data.profile) {
    await prisma.userProfile.upsert({
      where: { sessionId: session.id },
      update: {
        audienceType: data.profile.audienceType ?? null,
        expertiseLevel: data.profile.expertiseLevel ?? null,
        interests: JSON.stringify(data.profile.interests ?? []),
        completedOnboarding: data.profile.completedOnboarding ?? false,
      },
      create: {
        sessionId: session.id,
        audienceType: data.profile.audienceType ?? null,
        expertiseLevel: data.profile.expertiseLevel ?? null,
        interests: JSON.stringify(data.profile.interests ?? []),
        completedOnboarding: data.profile.completedOnboarding ?? false,
      },
    });
  }

  return {
    sessionId: session.id,
    results,
  };
}

// =============================================================================
// Profile Updates
// =============================================================================

/**
 * Update user profile.
 *
 * @param sessionId - Session ID
 * @param data - Profile data to update
 * @returns Updated profile
 */
export async function updateProfile(
  sessionId: string,
  data: {
    audienceType?: string;
    expertiseLevel?: string;
    interests?: string[];
    completedOnboarding?: boolean;
  }
) {
  return prisma.userProfile.upsert({
    where: { sessionId },
    update: {
      ...(data.audienceType !== undefined && { audienceType: data.audienceType }),
      ...(data.expertiseLevel !== undefined && { expertiseLevel: data.expertiseLevel }),
      ...(data.interests !== undefined && { interests: JSON.stringify(data.interests) }),
      ...(data.completedOnboarding !== undefined && { completedOnboarding: data.completedOnboarding }),
    },
    create: {
      sessionId,
      audienceType: data.audienceType ?? null,
      expertiseLevel: data.expertiseLevel ?? null,
      interests: JSON.stringify(data.interests ?? []),
      completedOnboarding: data.completedOnboarding ?? false,
    },
  });
}

/**
 * Get user profile by session ID.
 *
 * @param sessionId - Session ID
 * @returns Profile or null
 */
export async function getProfile(sessionId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { sessionId },
  });

  if (!profile) return null;

  return {
    ...profile,
    interests: JSON.parse(profile.interests) as string[],
  };
}
