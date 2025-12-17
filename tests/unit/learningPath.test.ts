import {
  LearningPathSchema,
  LearningPathArraySchema,
  DifficultySchema,
  validateLearningPath,
  safeParseLearningPath,
  type LearningPath,
  type Difficulty,
} from '../../src/types/learningPath';

describe('LearningPath Types and Validation', () => {
  // Valid learning path fixture for tests
  const validLearningPath: LearningPath = {
    id: 'chatgpt-story',
    title: 'The ChatGPT Story',
    description: 'Follow the journey from transformers to ChatGPT and understand how AI chatbots came to be.',
    targetAudience: 'Business professionals new to AI',
    milestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2022_CHATGPT'],
    estimatedMinutes: 30,
    difficulty: 'beginner',
    suggestedNextPathIds: ['ai-fundamentals'],
    keyTakeaways: [
      'Understand what transformers are and why they matter',
      'Know the difference between GPT models',
      'Explain ChatGPT to colleagues',
    ],
    conceptsCovered: ['transformer', 'attention', 'llm', 'chatbot'],
    icon: '🤖',
  };

  describe('DifficultySchema', () => {
    it('should accept valid difficulty levels', () => {
      expect(DifficultySchema.safeParse('beginner').success).toBe(true);
      expect(DifficultySchema.safeParse('intermediate').success).toBe(true);
      expect(DifficultySchema.safeParse('advanced').success).toBe(true);
    });

    it('should reject invalid difficulty levels', () => {
      expect(DifficultySchema.safeParse('expert').success).toBe(false);
      expect(DifficultySchema.safeParse('easy').success).toBe(false);
      expect(DifficultySchema.safeParse('').success).toBe(false);
    });
  });

  describe('LearningPathSchema', () => {
    it('should validate a complete learning path', () => {
      const result = LearningPathSchema.safeParse(validLearningPath);
      expect(result.success).toBe(true);
    });

    it('should validate learning path without optional icon', () => {
      const { icon: _icon, ...pathWithoutIcon } = validLearningPath;
      const result = LearningPathSchema.safeParse(pathWithoutIcon);
      expect(result.success).toBe(true);
    });

    it('should default suggestedNextPathIds to empty array', () => {
      const {
        suggestedNextPathIds: _suggested,
        ...pathWithoutSuggested
      } = validLearningPath;
      const result = LearningPathSchema.safeParse(pathWithoutSuggested);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestedNextPathIds).toEqual([]);
      }
    });

    describe('id field', () => {
      it('should reject empty id', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          id: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('title field', () => {
      it('should reject empty title', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          title: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject title over 100 characters', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          title: 'A'.repeat(101),
        });
        expect(result.success).toBe(false);
      });

      it('should accept title at exactly 100 characters', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          title: 'A'.repeat(100),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('description field', () => {
      it('should reject description under 10 characters', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          description: 'Short',
        });
        expect(result.success).toBe(false);
      });

      it('should reject description over 500 characters', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          description: 'A'.repeat(501),
        });
        expect(result.success).toBe(false);
      });

      it('should accept description at boundaries', () => {
        const result10 = LearningPathSchema.safeParse({
          ...validLearningPath,
          description: 'A'.repeat(10),
        });
        const result500 = LearningPathSchema.safeParse({
          ...validLearningPath,
          description: 'A'.repeat(500),
        });
        expect(result10.success).toBe(true);
        expect(result500.success).toBe(true);
      });
    });

    describe('milestoneIds field', () => {
      it('should reject fewer than 3 milestone IDs', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          milestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3'],
        });
        expect(result.success).toBe(false);
      });

      it('should accept exactly 3 milestone IDs', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          milestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2022_CHATGPT'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept more than 3 milestone IDs', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          milestoneIds: [
            'E2017_TRANSFORMER',
            'E2020_GPT3',
            'E2022_CHATGPT',
            'E2023_GPT4',
          ],
        });
        expect(result.success).toBe(true);
      });
    });

    describe('estimatedMinutes field', () => {
      it('should reject time under 5 minutes', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          estimatedMinutes: 4,
        });
        expect(result.success).toBe(false);
      });

      it('should reject time over 120 minutes', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          estimatedMinutes: 121,
        });
        expect(result.success).toBe(false);
      });

      it('should accept time at boundaries', () => {
        const result5 = LearningPathSchema.safeParse({
          ...validLearningPath,
          estimatedMinutes: 5,
        });
        const result120 = LearningPathSchema.safeParse({
          ...validLearningPath,
          estimatedMinutes: 120,
        });
        expect(result5.success).toBe(true);
        expect(result120.success).toBe(true);
      });
    });

    describe('keyTakeaways field', () => {
      it('should reject fewer than 3 takeaways', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
        });
        expect(result.success).toBe(false);
      });

      it('should reject more than 5 takeaways', () => {
        const result = LearningPathSchema.safeParse({
          ...validLearningPath,
          keyTakeaways: [
            'Takeaway 1',
            'Takeaway 2',
            'Takeaway 3',
            'Takeaway 4',
            'Takeaway 5',
            'Takeaway 6',
          ],
        });
        expect(result.success).toBe(false);
      });

      it('should accept 3-5 takeaways', () => {
        const result3 = LearningPathSchema.safeParse({
          ...validLearningPath,
          keyTakeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
        });
        const result5 = LearningPathSchema.safeParse({
          ...validLearningPath,
          keyTakeaways: [
            'Takeaway 1',
            'Takeaway 2',
            'Takeaway 3',
            'Takeaway 4',
            'Takeaway 5',
          ],
        });
        expect(result3.success).toBe(true);
        expect(result5.success).toBe(true);
      });
    });
  });

  describe('LearningPathArraySchema', () => {
    it('should validate an array of learning paths', () => {
      const paths: LearningPath[] = [
        validLearningPath,
        {
          ...validLearningPath,
          id: 'ai-fundamentals',
          title: 'AI Fundamentals',
        },
      ];
      const result = LearningPathArraySchema.safeParse(paths);
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = LearningPathArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should reject array with invalid path', () => {
      const paths = [
        validLearningPath,
        { ...validLearningPath, id: '', title: 'Invalid' },
      ];
      const result = LearningPathArraySchema.safeParse(paths);
      expect(result.success).toBe(false);
    });
  });

  describe('validateLearningPath helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateLearningPath(validLearningPath);
      expect(result.id).toBe('chatgpt-story');
      expect(result.title).toBe('The ChatGPT Story');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateLearningPath({ ...validLearningPath, id: '' });
      }).toThrow();
    });
  });

  describe('safeParseLearningPath helper', () => {
    it('should return success result for valid input', () => {
      const result = safeParseLearningPath(validLearningPath);
      expect(result.success).toBe(true);
    });

    it('should return failure result for invalid input', () => {
      const result = safeParseLearningPath({ ...validLearningPath, id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('Type inference', () => {
    it('should correctly infer Difficulty type', () => {
      // Type-level test - if this compiles, the type is correct
      const difficulty: Difficulty = 'beginner';
      expect(['beginner', 'intermediate', 'advanced']).toContain(difficulty);
    });
  });
});
