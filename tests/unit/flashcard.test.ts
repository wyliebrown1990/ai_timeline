import {
  UserFlashcardSchema,
  FlashcardPackSchema,
  FlashcardReviewSessionSchema,
  FlashcardStatsSchema,
  validateUserFlashcard,
  safeParseUserFlashcard,
  validateFlashcardPack,
  safeParseFlashcardPack,
  validateFlashcardReviewSession,
  safeParseFlashcardReviewSession,
  validateFlashcardStats,
  safeParseFlashcardStats,
  createUserFlashcard,
  createFlashcardPack,
  createInitialStats,
  calculateNextReview,
  getNextReviewDate,
  isCardDue,
  isCardMastered,
  PACK_COLORS,
  DEFAULT_PACKS,
  FLASHCARD_STORAGE_KEYS,
  type UserFlashcard,
  type FlashcardPack,
  type FlashcardReviewSession,
  type FlashcardStats,
  type QualityRating,
} from '../../src/types/flashcard';

describe('Flashcard Types and Validation', () => {
  // ==========================================================================
  // Test Fixtures
  // ==========================================================================

  const validUserFlashcard: UserFlashcard = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    sourceType: 'milestone',
    sourceId: 'E2017_TRANSFORMER',
    packIds: ['pack-1', 'pack-2'],
    createdAt: '2024-01-15T10:30:00.000Z',
    easeFactor: 2.5,
    interval: 6,
    repetitions: 2,
    nextReviewDate: '2024-01-21T10:30:00.000Z',
    lastReviewedAt: '2024-01-15T10:30:00.000Z',
  };

  const validFlashcardPack: FlashcardPack = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Transformer Era',
    description: 'Key milestones from the Transformer era',
    color: '#8B5CF6',
    isDefault: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const validReviewSession: FlashcardReviewSession = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    packId: 'pack-1',
    startedAt: '2024-01-15T10:00:00.000Z',
    completedAt: '2024-01-15T10:15:00.000Z',
    cardsReviewed: 10,
    cardsCorrect: 8,
    cardsToReview: 2,
  };

  const validFlashcardStats: FlashcardStats = {
    totalCards: 25,
    cardsDueToday: 5,
    cardsReviewedToday: 3,
    currentStreak: 7,
    longestStreak: 14,
    masteredCards: 10,
    lastStudyDate: '2024-01-15T10:30:00.000Z',
  };

  // ==========================================================================
  // UserFlashcard Schema Tests
  // ==========================================================================

  describe('UserFlashcardSchema', () => {
    it('should validate a valid user flashcard', () => {
      const result = UserFlashcardSchema.safeParse(validUserFlashcard);
      expect(result.success).toBe(true);
    });

    it('should accept milestone sourceType', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        sourceType: 'milestone',
      });
      expect(result.success).toBe(true);
    });

    it('should accept concept sourceType', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        sourceType: 'concept',
        sourceId: 'C_SELF_ATTENTION',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sourceType', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        sourceType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should require valid UUID for id', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should require valid datetime for createdAt', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        createdAt: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });

    it('should constrain easeFactor to valid SM-2 range [1.3, 3.0]', () => {
      const tooLow = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        easeFactor: 1.2,
      });
      const tooHigh = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        easeFactor: 3.1,
      });
      expect(tooLow.success).toBe(false);
      expect(tooHigh.success).toBe(false);

      // Valid boundaries
      const minValid = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        easeFactor: 1.3,
      });
      const maxValid = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        easeFactor: 3.0,
      });
      expect(minValid.success).toBe(true);
      expect(maxValid.success).toBe(true);
    });

    it('should require non-negative interval', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        interval: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should require non-negative repetitions', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        repetitions: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should allow null for nextReviewDate and lastReviewedAt', () => {
      const result = UserFlashcardSchema.safeParse({
        ...validUserFlashcard,
        nextReviewDate: null,
        lastReviewedAt: null,
      });
      expect(result.success).toBe(true);
    });

    it('should default packIds to empty array', () => {
      const { packIds: _packIds, ...flashcardWithoutPacks } = validUserFlashcard;
      const result = UserFlashcardSchema.safeParse(flashcardWithoutPacks);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.packIds).toEqual([]);
      }
    });

    it('should default SM-2 fields when not provided', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sourceType: 'milestone',
        sourceId: 'E2017_TRANSFORMER',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      const result = UserFlashcardSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.easeFactor).toBe(2.5);
        expect(result.data.interval).toBe(0);
        expect(result.data.repetitions).toBe(0);
        expect(result.data.nextReviewDate).toBe(null);
        expect(result.data.lastReviewedAt).toBe(null);
      }
    });
  });

  // ==========================================================================
  // FlashcardPack Schema Tests
  // ==========================================================================

  describe('FlashcardPackSchema', () => {
    it('should validate a valid flashcard pack', () => {
      const result = FlashcardPackSchema.safeParse(validFlashcardPack);
      expect(result.success).toBe(true);
    });

    it('should require valid UUID for id', () => {
      const result = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should require name with 1-50 characters', () => {
      const emptyName = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        name: '',
      });
      const tooLong = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        name: 'A'.repeat(51),
      });
      expect(emptyName.success).toBe(false);
      expect(tooLong.success).toBe(false);

      // Valid boundaries
      const oneChar = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        name: 'A',
      });
      const fiftyChars = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        name: 'A'.repeat(50),
      });
      expect(oneChar.success).toBe(true);
      expect(fiftyChars.success).toBe(true);
    });

    it('should limit description to 200 characters', () => {
      const tooLong = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        description: 'A'.repeat(201),
      });
      expect(tooLong.success).toBe(false);

      const maxLength = FlashcardPackSchema.safeParse({
        ...validFlashcardPack,
        description: 'A'.repeat(200),
      });
      expect(maxLength.success).toBe(true);
    });

    it('should allow undefined description', () => {
      const { description: _desc, ...packWithoutDesc } = validFlashcardPack;
      const result = FlashcardPackSchema.safeParse(packWithoutDesc);
      expect(result.success).toBe(true);
    });

    it('should require valid hex color', () => {
      const invalidColors = [
        'red',
        '#GGG',
        '#12345',
        '#1234567',
        '3B82F6',
      ];
      invalidColors.forEach(color => {
        const result = FlashcardPackSchema.safeParse({
          ...validFlashcardPack,
          color,
        });
        expect(result.success).toBe(false);
      });

      // Valid colors
      const validColors = ['#3B82F6', '#10B981', '#ffffff', '#000000'];
      validColors.forEach(color => {
        const result = FlashcardPackSchema.safeParse({
          ...validFlashcardPack,
          color,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should default isDefault to false', () => {
      const { isDefault: _isDefault, ...packWithoutDefault } = validFlashcardPack;
      const result = FlashcardPackSchema.safeParse(packWithoutDefault);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isDefault).toBe(false);
      }
    });
  });

  // ==========================================================================
  // FlashcardReviewSession Schema Tests
  // ==========================================================================

  describe('FlashcardReviewSessionSchema', () => {
    it('should validate a valid review session', () => {
      const result = FlashcardReviewSessionSchema.safeParse(validReviewSession);
      expect(result.success).toBe(true);
    });

    it('should allow null packId for all-cards session', () => {
      const result = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        packId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should allow null completedAt for in-progress session', () => {
      const result = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        completedAt: null,
      });
      expect(result.success).toBe(true);
    });

    it('should require non-negative card counts', () => {
      const negativeReviewed = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        cardsReviewed: -1,
      });
      const negativeCorrect = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        cardsCorrect: -1,
      });
      const negativeToReview = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        cardsToReview: -1,
      });
      expect(negativeReviewed.success).toBe(false);
      expect(negativeCorrect.success).toBe(false);
      expect(negativeToReview.success).toBe(false);
    });

    it('should require valid datetime for startedAt', () => {
      const result = FlashcardReviewSessionSchema.safeParse({
        ...validReviewSession,
        startedAt: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // FlashcardStats Schema Tests
  // ==========================================================================

  describe('FlashcardStatsSchema', () => {
    it('should validate valid flashcard stats', () => {
      const result = FlashcardStatsSchema.safeParse(validFlashcardStats);
      expect(result.success).toBe(true);
    });

    it('should require non-negative counts', () => {
      const fields = [
        'totalCards',
        'cardsDueToday',
        'cardsReviewedToday',
        'currentStreak',
        'longestStreak',
        'masteredCards',
      ];
      fields.forEach(field => {
        const result = FlashcardStatsSchema.safeParse({
          ...validFlashcardStats,
          [field]: -1,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should allow null lastStudyDate', () => {
      const result = FlashcardStatsSchema.safeParse({
        ...validFlashcardStats,
        lastStudyDate: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Validation Helper Tests
  // ==========================================================================

  describe('validateUserFlashcard helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateUserFlashcard(validUserFlashcard);
      expect(result.id).toBe(validUserFlashcard.id);
    });

    it('should throw for invalid input', () => {
      expect(() => validateUserFlashcard({ id: 'invalid' })).toThrow();
    });
  });

  describe('safeParseUserFlashcard helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseUserFlashcard(validUserFlashcard);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseUserFlashcard({ id: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateFlashcardPack helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateFlashcardPack(validFlashcardPack);
      expect(result.name).toBe(validFlashcardPack.name);
    });

    it('should throw for invalid input', () => {
      expect(() => validateFlashcardPack({ id: 'invalid' })).toThrow();
    });
  });

  describe('safeParseFlashcardPack helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseFlashcardPack(validFlashcardPack);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseFlashcardPack({ id: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateFlashcardReviewSession helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateFlashcardReviewSession(validReviewSession);
      expect(result.cardsReviewed).toBe(validReviewSession.cardsReviewed);
    });

    it('should throw for invalid input', () => {
      expect(() => validateFlashcardReviewSession({ id: 'invalid' })).toThrow();
    });
  });

  describe('safeParseFlashcardReviewSession helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseFlashcardReviewSession(validReviewSession);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseFlashcardReviewSession({ id: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateFlashcardStats helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateFlashcardStats(validFlashcardStats);
      expect(result.totalCards).toBe(validFlashcardStats.totalCards);
    });

    it('should throw for invalid input', () => {
      expect(() => validateFlashcardStats({ totalCards: -1 })).toThrow();
    });
  });

  describe('safeParseFlashcardStats helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseFlashcardStats(validFlashcardStats);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseFlashcardStats({ totalCards: -1 });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Data Creation Helper Tests
  // ==========================================================================

  describe('createUserFlashcard', () => {
    const mockGenerateId = () => '123e4567-e89b-12d3-a456-426614174000';

    it('should create a flashcard with default SM-2 values', () => {
      const card = createUserFlashcard(mockGenerateId, 'milestone', 'E2017_TRANSFORMER');
      expect(card.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(card.sourceType).toBe('milestone');
      expect(card.sourceId).toBe('E2017_TRANSFORMER');
      expect(card.easeFactor).toBe(2.5);
      expect(card.interval).toBe(0);
      expect(card.repetitions).toBe(0);
      expect(card.lastReviewedAt).toBe(null);
      expect(card.packIds).toEqual([]);
    });

    it('should create a flashcard with specified packIds', () => {
      const card = createUserFlashcard(mockGenerateId, 'concept', 'C_ATTENTION', ['pack-1', 'pack-2']);
      expect(card.packIds).toEqual(['pack-1', 'pack-2']);
    });

    it('should set nextReviewDate to now (due immediately)', () => {
      const before = new Date().toISOString();
      const card = createUserFlashcard(mockGenerateId, 'milestone', 'E2017_TRANSFORMER');
      const after = new Date().toISOString();
      expect(card.nextReviewDate).not.toBe(null);
      expect(card.nextReviewDate! >= before).toBe(true);
      expect(card.nextReviewDate! <= after).toBe(true);
    });
  });

  describe('createFlashcardPack', () => {
    const mockGenerateId = () => '123e4567-e89b-12d3-a456-426614174001';

    it('should create a pack with required fields', () => {
      const pack = createFlashcardPack(mockGenerateId, 'My Pack');
      expect(pack.id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(pack.name).toBe('My Pack');
      expect(pack.color).toBe(PACK_COLORS[0]); // Default blue
      expect(pack.isDefault).toBe(false);
      expect(pack.description).toBeUndefined();
    });

    it('should create a pack with custom color', () => {
      const pack = createFlashcardPack(mockGenerateId, 'My Pack', '#EF4444');
      expect(pack.color).toBe('#EF4444');
    });

    it('should create a pack with description', () => {
      const pack = createFlashcardPack(mockGenerateId, 'My Pack', '#3B82F6', 'A custom description');
      expect(pack.description).toBe('A custom description');
    });

    it('should create a default pack when specified', () => {
      const pack = createFlashcardPack(mockGenerateId, 'System Pack', '#3B82F6', undefined, true);
      expect(pack.isDefault).toBe(true);
    });
  });

  describe('createInitialStats', () => {
    it('should create stats with all zeros and null lastStudyDate', () => {
      const stats = createInitialStats();
      expect(stats.totalCards).toBe(0);
      expect(stats.cardsDueToday).toBe(0);
      expect(stats.cardsReviewedToday).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.masteredCards).toBe(0);
      expect(stats.lastStudyDate).toBe(null);
    });
  });

  // ==========================================================================
  // SM-2 Algorithm Tests
  // ==========================================================================

  describe('calculateNextReview (SM-2 algorithm)', () => {
    it('should reset repetitions on failed review (quality < 3)', () => {
      const failedQualities: QualityRating[] = [0, 1, 2];
      failedQualities.forEach(quality => {
        const result = calculateNextReview(quality, 2.5, 6, 3);
        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(0);
      });
    });

    it('should set interval to 1 day on first success', () => {
      const result = calculateNextReview(4, 2.5, 0, 0);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('should set interval to 6 days on second success', () => {
      const result = calculateNextReview(4, 2.5, 1, 1);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
    });

    it('should multiply interval by ease factor on subsequent successes', () => {
      const result = calculateNextReview(4, 2.5, 6, 2);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
    });

    it('should decrease ease factor on low quality (3)', () => {
      const result = calculateNextReview(3, 2.5, 6, 2);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('should maintain ease factor on quality 4', () => {
      const result = calculateNextReview(4, 2.5, 6, 2);
      // Quality 4: EF' = EF + (0.1 - (5-4) * (0.08 + (5-4) * 0.02))
      // EF' = 2.5 + (0.1 - 1 * (0.08 + 0.02)) = 2.5 + 0.1 - 0.1 = 2.5
      expect(result.easeFactor).toBe(2.5);
    });

    it('should increase ease factor on perfect recall (quality 5)', () => {
      const result = calculateNextReview(5, 2.5, 6, 2);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it('should clamp ease factor to minimum 1.3', () => {
      // Multiple failed reviews with quality 0 should not go below 1.3
      let ef = 2.5;
      for (let i = 0; i < 10; i++) {
        const result = calculateNextReview(0, ef, 0, 0);
        ef = result.easeFactor;
      }
      expect(ef).toBeGreaterThanOrEqual(1.3);
    });

    it('should clamp ease factor to maximum 3.0', () => {
      // Multiple perfect reviews should not exceed 3.0
      let ef = 2.5;
      for (let i = 0; i < 20; i++) {
        const result = calculateNextReview(5, ef, 10, 10);
        ef = result.easeFactor;
      }
      expect(ef).toBeLessThanOrEqual(3.0);
    });
  });

  describe('getNextReviewDate', () => {
    it('should return date N days in the future', () => {
      const now = new Date();
      const result = getNextReviewDate(7);
      const resultDate = new Date(result);
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 7);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(resultDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('should return today for interval 0', () => {
      const now = new Date();
      const result = getNextReviewDate(0);
      const resultDate = new Date(result);

      expect(resultDate.getDate()).toBe(now.getDate());
    });
  });

  describe('isCardDue', () => {
    it('should return true when nextReviewDate is null', () => {
      const card = { ...validUserFlashcard, nextReviewDate: null };
      expect(isCardDue(card)).toBe(true);
    });

    it('should return true when nextReviewDate is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const card = { ...validUserFlashcard, nextReviewDate: pastDate.toISOString() };
      expect(isCardDue(card)).toBe(true);
    });

    it('should return true when nextReviewDate is now', () => {
      const card = { ...validUserFlashcard, nextReviewDate: new Date().toISOString() };
      expect(isCardDue(card)).toBe(true);
    });

    it('should return false when nextReviewDate is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const card = { ...validUserFlashcard, nextReviewDate: futureDate.toISOString() };
      expect(isCardDue(card)).toBe(false);
    });
  });

  describe('isCardMastered', () => {
    it('should return false when interval <= 21', () => {
      expect(isCardMastered({ ...validUserFlashcard, interval: 0 })).toBe(false);
      expect(isCardMastered({ ...validUserFlashcard, interval: 21 })).toBe(false);
    });

    it('should return true when interval > 21', () => {
      expect(isCardMastered({ ...validUserFlashcard, interval: 22 })).toBe(true);
      expect(isCardMastered({ ...validUserFlashcard, interval: 30 })).toBe(true);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe('Constants', () => {
    it('PACK_COLORS should contain 8 valid hex colors', () => {
      expect(PACK_COLORS).toHaveLength(8);
      PACK_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('DEFAULT_PACKS should have expected system packs', () => {
      expect(DEFAULT_PACKS).toHaveLength(2);
      expect(DEFAULT_PACKS[0].name).toBe('All Cards');
      expect(DEFAULT_PACKS[0].isDefault).toBe(true);
      expect(DEFAULT_PACKS[1].name).toBe('Recently Added');
      expect(DEFAULT_PACKS[1].isDefault).toBe(true);
    });

    it('FLASHCARD_STORAGE_KEYS should have expected keys', () => {
      expect(FLASHCARD_STORAGE_KEYS.CARDS).toBe('ai-timeline-flashcards');
      expect(FLASHCARD_STORAGE_KEYS.PACKS).toBe('ai-timeline-flashcard-packs');
      expect(FLASHCARD_STORAGE_KEYS.STATS).toBe('ai-timeline-flashcard-stats');
      expect(FLASHCARD_STORAGE_KEYS.SESSIONS).toBe('ai-timeline-flashcard-sessions');
    });
  });
});
