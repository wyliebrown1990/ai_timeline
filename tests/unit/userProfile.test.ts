import {
  UserRoleSchema,
  LearningGoalSchema,
  TimeCommitmentSchema,
  ExplanationLevelSchema,
  UserProfileSchema,
  CreateUserProfileSchema,
  UpdateUserProfileSchema,
  validateUserProfile,
  safeParseUserProfile,
  validateCreateUserProfile,
  safeParseCreateUserProfile,
  USER_ROLE_LABELS,
  LEARNING_GOAL_LABELS,
  TIME_COMMITMENT_OPTIONS,
  EXPLANATION_LEVEL_OPTIONS,
  USER_ROLES,
  LEARNING_GOALS,
  TIME_COMMITMENTS,
  EXPLANATION_LEVELS,
  type UserRole,
  type LearningGoal,
  type TimeCommitment,
  type ExplanationLevel,
  type UserProfile,
  type CreateUserProfile,
} from '../../src/types/userProfile';

describe('UserProfile Types and Validation', () => {
  // Valid user profile fixture
  const validUserProfile: UserProfile = {
    id: 'user-123',
    role: 'product_manager',
    goals: ['discuss_at_work', 'evaluate_tools'],
    timeCommitment: 'standard',
    preferredExplanationLevel: 'business',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  };

  const validCreateProfile: CreateUserProfile = {
    role: 'executive',
    goals: ['discuss_at_work', 'hype_vs_real'],
    timeCommitment: 'quick',
    preferredExplanationLevel: 'simple',
  };

  // ==========================================================================
  // Enum Schema Tests
  // ==========================================================================

  describe('UserRoleSchema', () => {
    it('should accept all valid roles', () => {
      for (const role of USER_ROLES) {
        expect(UserRoleSchema.safeParse(role).success).toBe(true);
      }
    });

    it('should reject invalid roles', () => {
      expect(UserRoleSchema.safeParse('invalid_role').success).toBe(false);
      expect(UserRoleSchema.safeParse('').success).toBe(false);
      expect(UserRoleSchema.safeParse('EXECUTIVE').success).toBe(false);
    });
  });

  describe('LearningGoalSchema', () => {
    it('should accept all valid goals', () => {
      for (const goal of LEARNING_GOALS) {
        expect(LearningGoalSchema.safeParse(goal).success).toBe(true);
      }
    });

    it('should reject invalid goals', () => {
      expect(LearningGoalSchema.safeParse('invalid_goal').success).toBe(false);
      expect(LearningGoalSchema.safeParse('').success).toBe(false);
    });
  });

  describe('TimeCommitmentSchema', () => {
    it('should accept all valid time commitments', () => {
      for (const commitment of TIME_COMMITMENTS) {
        expect(TimeCommitmentSchema.safeParse(commitment).success).toBe(true);
      }
    });

    it('should reject invalid time commitments', () => {
      expect(TimeCommitmentSchema.safeParse('long').success).toBe(false);
      expect(TimeCommitmentSchema.safeParse('').success).toBe(false);
    });
  });

  describe('ExplanationLevelSchema', () => {
    it('should accept all valid explanation levels', () => {
      for (const level of EXPLANATION_LEVELS) {
        expect(ExplanationLevelSchema.safeParse(level).success).toBe(true);
      }
    });

    it('should reject invalid explanation levels', () => {
      expect(ExplanationLevelSchema.safeParse('expert').success).toBe(false);
      expect(ExplanationLevelSchema.safeParse('').success).toBe(false);
    });
  });

  // ==========================================================================
  // UserProfileSchema Tests
  // ==========================================================================

  describe('UserProfileSchema', () => {
    it('should validate a complete user profile', () => {
      const result = UserProfileSchema.safeParse(validUserProfile);
      expect(result.success).toBe(true);
    });

    describe('id field', () => {
      it('should reject empty id', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          id: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('role field', () => {
      it('should accept all valid roles', () => {
        for (const role of USER_ROLES) {
          const result = UserProfileSchema.safeParse({
            ...validUserProfile,
            role,
          });
          expect(result.success).toBe(true);
        }
      });

      it('should reject invalid role', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          role: 'invalid',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('goals field', () => {
      it('should require at least 1 goal', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: [],
        });
        expect(result.success).toBe(false);
      });

      it('should reject more than 3 goals', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: [
            'discuss_at_work',
            'evaluate_tools',
            'hype_vs_real',
            'industry_impact',
          ],
        });
        expect(result.success).toBe(false);
      });

      it('should accept 1-3 goals', () => {
        const result1 = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: ['discuss_at_work'],
        });
        const result2 = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: ['discuss_at_work', 'evaluate_tools'],
        });
        const result3 = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: ['discuss_at_work', 'evaluate_tools', 'hype_vs_real'],
        });
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result3.success).toBe(true);
      });

      it('should reject invalid goals in array', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          goals: ['discuss_at_work', 'invalid_goal'],
        });
        expect(result.success).toBe(false);
      });
    });

    describe('timeCommitment field', () => {
      it('should accept all valid time commitments', () => {
        for (const commitment of TIME_COMMITMENTS) {
          const result = UserProfileSchema.safeParse({
            ...validUserProfile,
            timeCommitment: commitment,
          });
          expect(result.success).toBe(true);
        }
      });
    });

    describe('preferredExplanationLevel field', () => {
      it('should accept all valid explanation levels', () => {
        for (const level of EXPLANATION_LEVELS) {
          const result = UserProfileSchema.safeParse({
            ...validUserProfile,
            preferredExplanationLevel: level,
          });
          expect(result.success).toBe(true);
        }
      });
    });

    describe('timestamp fields', () => {
      it('should reject empty createdAt', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          createdAt: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject empty updatedAt', () => {
        const result = UserProfileSchema.safeParse({
          ...validUserProfile,
          updatedAt: '',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // CreateUserProfileSchema Tests
  // ==========================================================================

  describe('CreateUserProfileSchema', () => {
    it('should validate a valid create profile request', () => {
      const result = CreateUserProfileSchema.safeParse(validCreateProfile);
      expect(result.success).toBe(true);
    });

    it('should not require id or timestamps', () => {
      const result = CreateUserProfileSchema.safeParse({
        role: 'developer',
        goals: ['build_with_ai'],
        timeCommitment: 'deep',
        preferredExplanationLevel: 'technical',
      });
      expect(result.success).toBe(true);
    });

    it('should validate goals constraints', () => {
      const noGoals = CreateUserProfileSchema.safeParse({
        ...validCreateProfile,
        goals: [],
      });
      const tooManyGoals = CreateUserProfileSchema.safeParse({
        ...validCreateProfile,
        goals: [
          'discuss_at_work',
          'evaluate_tools',
          'hype_vs_real',
          'industry_impact',
        ],
      });
      expect(noGoals.success).toBe(false);
      expect(tooManyGoals.success).toBe(false);
    });
  });

  // ==========================================================================
  // UpdateUserProfileSchema Tests
  // ==========================================================================

  describe('UpdateUserProfileSchema', () => {
    it('should allow partial updates', () => {
      const roleOnly = UpdateUserProfileSchema.safeParse({ role: 'executive' });
      const goalsOnly = UpdateUserProfileSchema.safeParse({ goals: ['discuss_at_work'] });
      const empty = UpdateUserProfileSchema.safeParse({});

      expect(roleOnly.success).toBe(true);
      expect(goalsOnly.success).toBe(true);
      expect(empty.success).toBe(true);
    });

    it('should validate field types on partial updates', () => {
      const invalidRole = UpdateUserProfileSchema.safeParse({ role: 'invalid' });
      const invalidGoals = UpdateUserProfileSchema.safeParse({ goals: ['invalid'] });

      expect(invalidRole.success).toBe(false);
      expect(invalidGoals.success).toBe(false);
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('validateUserProfile helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateUserProfile(validUserProfile);
      expect(result.id).toBe('user-123');
      expect(result.role).toBe('product_manager');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateUserProfile({ ...validUserProfile, id: '' });
      }).toThrow();
    });
  });

  describe('safeParseUserProfile helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseUserProfile(validUserProfile);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseUserProfile({ ...validUserProfile, id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCreateUserProfile helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateCreateUserProfile(validCreateProfile);
      expect(result.role).toBe('executive');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateCreateUserProfile({ ...validCreateProfile, role: 'invalid' });
      }).toThrow();
    });
  });

  describe('safeParseCreateUserProfile helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseCreateUserProfile(validCreateProfile);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseCreateUserProfile({ ...validCreateProfile, role: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe('Constants', () => {
    it('USER_ROLE_LABELS should have labels for all roles', () => {
      expect(Object.keys(USER_ROLE_LABELS)).toHaveLength(USER_ROLES.length);
      for (const role of USER_ROLES) {
        expect(USER_ROLE_LABELS[role]).toBeDefined();
        expect(typeof USER_ROLE_LABELS[role]).toBe('string');
      }
    });

    it('LEARNING_GOAL_LABELS should have labels for all goals', () => {
      expect(Object.keys(LEARNING_GOAL_LABELS)).toHaveLength(LEARNING_GOALS.length);
      for (const goal of LEARNING_GOALS) {
        expect(LEARNING_GOAL_LABELS[goal]).toBeDefined();
        expect(typeof LEARNING_GOAL_LABELS[goal]).toBe('string');
      }
    });

    it('TIME_COMMITMENT_OPTIONS should have options for all commitments', () => {
      expect(Object.keys(TIME_COMMITMENT_OPTIONS)).toHaveLength(TIME_COMMITMENTS.length);
      for (const commitment of TIME_COMMITMENTS) {
        expect(TIME_COMMITMENT_OPTIONS[commitment]).toBeDefined();
        expect(TIME_COMMITMENT_OPTIONS[commitment].label).toBeDefined();
        expect(TIME_COMMITMENT_OPTIONS[commitment].minutes).toBeDefined();
      }
    });

    it('EXPLANATION_LEVEL_OPTIONS should have options for all levels', () => {
      expect(Object.keys(EXPLANATION_LEVEL_OPTIONS)).toHaveLength(EXPLANATION_LEVELS.length);
      for (const level of EXPLANATION_LEVELS) {
        expect(EXPLANATION_LEVEL_OPTIONS[level]).toBeDefined();
        expect(EXPLANATION_LEVEL_OPTIONS[level].label).toBeDefined();
        expect(EXPLANATION_LEVEL_OPTIONS[level].description).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Type Inference Tests
  // ==========================================================================

  describe('Type inference', () => {
    it('should correctly infer UserRole type', () => {
      const role: UserRole = 'executive';
      expect(USER_ROLES).toContain(role);
    });

    it('should correctly infer LearningGoal type', () => {
      const goal: LearningGoal = 'discuss_at_work';
      expect(LEARNING_GOALS).toContain(goal);
    });

    it('should correctly infer TimeCommitment type', () => {
      const commitment: TimeCommitment = 'quick';
      expect(TIME_COMMITMENTS).toContain(commitment);
    });

    it('should correctly infer ExplanationLevel type', () => {
      const level: ExplanationLevel = 'simple';
      expect(EXPLANATION_LEVELS).toContain(level);
    });
  });
});
