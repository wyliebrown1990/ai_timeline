import {
  MultipleChoiceQuestionSchema,
  OrderingQuestionSchema,
  MatchingQuestionSchema,
  ExplainBackQuestionSchema,
  QuestionSchema,
  CheckpointSchema,
  CheckpointArraySchema,
  FlashcardSchema,
  FlashcardArraySchema,
  validateQuestion,
  safeParseQuestion,
  validateCheckpoint,
  safeParseCheckpoint,
  validateFlashcard,
  safeParseFlashcard,
  isMultipleChoice,
  isOrdering,
  isMatching,
  isExplainBack,
  QUESTION_TYPES,
  type MultipleChoiceQuestion,
  type OrderingQuestion,
  type MatchingQuestion,
  type ExplainBackQuestion,
  type Question,
  type Checkpoint,
  type Flashcard,
} from '../../src/types/checkpoint';

describe('Checkpoint Types and Validation', () => {
  // ==========================================================================
  // Test Fixtures
  // ==========================================================================

  const validMultipleChoice: MultipleChoiceQuestion = {
    type: 'multiple_choice',
    id: 'q1',
    question: 'What year was the Transformer architecture introduced?',
    options: ['2015', '2016', '2017', '2018'],
    correctIndex: 2,
    explanation: 'The Transformer was introduced in the "Attention Is All You Need" paper in 2017.',
  };

  const validOrdering: OrderingQuestion = {
    type: 'ordering',
    id: 'q2',
    prompt: 'Put these AI milestones in chronological order:',
    items: [
      { id: 'gpt3', label: 'GPT-3', date: '2020' },
      { id: 'transformer', label: 'Transformer', date: '2017' },
      { id: 'chatgpt', label: 'ChatGPT', date: '2022' },
    ],
    correctOrder: ['transformer', 'gpt3', 'chatgpt'],
  };

  const validMatching: MatchingQuestion = {
    type: 'matching',
    id: 'q3',
    prompt: 'Match each company with their AI product:',
    pairs: [
      { id: 'p1', left: 'OpenAI', right: 'ChatGPT' },
      { id: 'p2', left: 'Anthropic', right: 'Claude' },
      { id: 'p3', left: 'Google', right: 'Bard' },
    ],
  };

  const validExplainBack: ExplainBackQuestion = {
    type: 'explain_back',
    id: 'q4',
    concept: 'Transformer',
    prompt: 'Explain the Transformer architecture in your own words.',
    rubric: 'Should mention attention mechanism, parallel processing, and impact on NLP.',
  };

  const validCheckpoint: Checkpoint = {
    id: 'cp1',
    title: 'Understanding Transformers',
    pathId: 'chatgpt-story',
    afterMilestoneId: 'E2017_TRANSFORMER',
    questions: [validMultipleChoice, validOrdering],
  };

  const validFlashcard: Flashcard = {
    id: 'fc1',
    term: 'Transformer',
    definition: 'A neural network architecture that uses attention mechanisms to process sequences.',
    category: 'model_architecture',
    relatedMilestoneIds: ['E2017_TRANSFORMER'],
  };

  // ==========================================================================
  // Multiple Choice Question Tests
  // ==========================================================================

  describe('MultipleChoiceQuestionSchema', () => {
    it('should validate a valid multiple choice question', () => {
      const result = MultipleChoiceQuestionSchema.safeParse(validMultipleChoice);
      expect(result.success).toBe(true);
    });

    it('should require exactly 4 options', () => {
      const threeOptions = {
        ...validMultipleChoice,
        options: ['A', 'B', 'C'],
      };
      const fiveOptions = {
        ...validMultipleChoice,
        options: ['A', 'B', 'C', 'D', 'E'],
      };
      expect(MultipleChoiceQuestionSchema.safeParse(threeOptions).success).toBe(false);
      expect(MultipleChoiceQuestionSchema.safeParse(fiveOptions).success).toBe(false);
    });

    it('should require correctIndex between 0 and 3', () => {
      const negativeIndex = { ...validMultipleChoice, correctIndex: -1 };
      const tooHighIndex = { ...validMultipleChoice, correctIndex: 4 };
      expect(MultipleChoiceQuestionSchema.safeParse(negativeIndex).success).toBe(false);
      expect(MultipleChoiceQuestionSchema.safeParse(tooHighIndex).success).toBe(false);
    });

    it('should reject empty question', () => {
      const result = MultipleChoiceQuestionSchema.safeParse({
        ...validMultipleChoice,
        question: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty explanation', () => {
      const result = MultipleChoiceQuestionSchema.safeParse({
        ...validMultipleChoice,
        explanation: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Ordering Question Tests
  // ==========================================================================

  describe('OrderingQuestionSchema', () => {
    it('should validate a valid ordering question', () => {
      const result = OrderingQuestionSchema.safeParse(validOrdering);
      expect(result.success).toBe(true);
    });

    it('should require 3-6 items', () => {
      const twoItems = {
        ...validOrdering,
        items: validOrdering.items.slice(0, 2),
        correctOrder: validOrdering.correctOrder.slice(0, 2),
      };
      expect(OrderingQuestionSchema.safeParse(twoItems).success).toBe(false);

      const sevenItems = {
        ...validOrdering,
        items: [
          ...validOrdering.items,
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
          { id: 'd', label: 'D' },
        ],
        correctOrder: [...validOrdering.correctOrder, 'a', 'b', 'c', 'd'],
      };
      expect(OrderingQuestionSchema.safeParse(sevenItems).success).toBe(false);
    });

    it('should allow items without date', () => {
      const itemsWithoutDate = {
        ...validOrdering,
        items: [
          { id: 'a', label: 'First' },
          { id: 'b', label: 'Second' },
          { id: 'c', label: 'Third' },
        ],
      };
      const result = OrderingQuestionSchema.safeParse(itemsWithoutDate);
      expect(result.success).toBe(true);
    });

    it('should reject empty prompt', () => {
      const result = OrderingQuestionSchema.safeParse({
        ...validOrdering,
        prompt: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Matching Question Tests
  // ==========================================================================

  describe('MatchingQuestionSchema', () => {
    it('should validate a valid matching question', () => {
      const result = MatchingQuestionSchema.safeParse(validMatching);
      expect(result.success).toBe(true);
    });

    it('should require 3-6 pairs', () => {
      const twoPairs = {
        ...validMatching,
        pairs: validMatching.pairs.slice(0, 2),
      };
      expect(MatchingQuestionSchema.safeParse(twoPairs).success).toBe(false);

      const sevenPairs = {
        ...validMatching,
        pairs: [
          ...validMatching.pairs,
          { id: 'p4', left: 'A', right: 'B' },
          { id: 'p5', left: 'C', right: 'D' },
          { id: 'p6', left: 'E', right: 'F' },
          { id: 'p7', left: 'G', right: 'H' },
        ],
      };
      expect(MatchingQuestionSchema.safeParse(sevenPairs).success).toBe(false);
    });

    it('should reject pairs with empty left or right', () => {
      const emptyLeft = {
        ...validMatching,
        pairs: [
          { id: 'p1', left: '', right: 'ChatGPT' },
          ...validMatching.pairs.slice(1),
        ],
      };
      const emptyRight = {
        ...validMatching,
        pairs: [
          { id: 'p1', left: 'OpenAI', right: '' },
          ...validMatching.pairs.slice(1),
        ],
      };
      expect(MatchingQuestionSchema.safeParse(emptyLeft).success).toBe(false);
      expect(MatchingQuestionSchema.safeParse(emptyRight).success).toBe(false);
    });
  });

  // ==========================================================================
  // Explain Back Question Tests
  // ==========================================================================

  describe('ExplainBackQuestionSchema', () => {
    it('should validate a valid explain back question', () => {
      const result = ExplainBackQuestionSchema.safeParse(validExplainBack);
      expect(result.success).toBe(true);
    });

    it('should reject empty concept', () => {
      const result = ExplainBackQuestionSchema.safeParse({
        ...validExplainBack,
        concept: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty prompt', () => {
      const result = ExplainBackQuestionSchema.safeParse({
        ...validExplainBack,
        prompt: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty rubric', () => {
      const result = ExplainBackQuestionSchema.safeParse({
        ...validExplainBack,
        rubric: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Discriminated Union Tests
  // ==========================================================================

  describe('QuestionSchema (discriminated union)', () => {
    it('should validate all question types', () => {
      expect(QuestionSchema.safeParse(validMultipleChoice).success).toBe(true);
      expect(QuestionSchema.safeParse(validOrdering).success).toBe(true);
      expect(QuestionSchema.safeParse(validMatching).success).toBe(true);
      expect(QuestionSchema.safeParse(validExplainBack).success).toBe(true);
    });

    it('should reject unknown question type', () => {
      const unknownType = {
        type: 'unknown_type',
        id: 'q1',
        question: 'Test question',
      };
      const result = QuestionSchema.safeParse(unknownType);
      expect(result.success).toBe(false);
    });

    it('should correctly discriminate by type', () => {
      const result = QuestionSchema.safeParse(validMultipleChoice);
      if (result.success) {
        expect(result.data.type).toBe('multiple_choice');
      }
    });
  });

  // ==========================================================================
  // Checkpoint Tests
  // ==========================================================================

  describe('CheckpointSchema', () => {
    it('should validate a valid checkpoint', () => {
      const result = CheckpointSchema.safeParse(validCheckpoint);
      expect(result.success).toBe(true);
    });

    it('should require 1-5 questions', () => {
      const noQuestions = { ...validCheckpoint, questions: [] };
      expect(CheckpointSchema.safeParse(noQuestions).success).toBe(false);

      const sixQuestions = {
        ...validCheckpoint,
        questions: [
          validMultipleChoice,
          validOrdering,
          validMatching,
          validExplainBack,
          { ...validMultipleChoice, id: 'q5' },
          { ...validMultipleChoice, id: 'q6' },
        ],
      };
      expect(CheckpointSchema.safeParse(sixQuestions).success).toBe(false);
    });

    it('should accept checkpoint with mixed question types', () => {
      const mixedCheckpoint = {
        ...validCheckpoint,
        questions: [
          validMultipleChoice,
          validOrdering,
          validMatching,
          validExplainBack,
        ],
      };
      const result = CheckpointSchema.safeParse(mixedCheckpoint);
      expect(result.success).toBe(true);
    });

    it('should reject empty pathId', () => {
      const result = CheckpointSchema.safeParse({
        ...validCheckpoint,
        pathId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty afterMilestoneId', () => {
      const result = CheckpointSchema.safeParse({
        ...validCheckpoint,
        afterMilestoneId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CheckpointArraySchema', () => {
    it('should validate array of checkpoints', () => {
      const checkpoints = [
        validCheckpoint,
        { ...validCheckpoint, id: 'cp2', title: 'Second Checkpoint' },
      ];
      const result = CheckpointArraySchema.safeParse(checkpoints);
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = CheckpointArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Flashcard Tests
  // ==========================================================================

  describe('FlashcardSchema', () => {
    it('should validate a valid flashcard', () => {
      const result = FlashcardSchema.safeParse(validFlashcard);
      expect(result.success).toBe(true);
    });

    it('should default relatedMilestoneIds to empty array', () => {
      const { relatedMilestoneIds: _related, ...flashcardWithoutRelated } = validFlashcard;
      const result = FlashcardSchema.safeParse(flashcardWithoutRelated);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relatedMilestoneIds).toEqual([]);
      }
    });

    it('should reject empty term', () => {
      const result = FlashcardSchema.safeParse({
        ...validFlashcard,
        term: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty definition', () => {
      const result = FlashcardSchema.safeParse({
        ...validFlashcard,
        definition: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty category', () => {
      const result = FlashcardSchema.safeParse({
        ...validFlashcard,
        category: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FlashcardArraySchema', () => {
    it('should validate array of flashcards', () => {
      const flashcards = [
        validFlashcard,
        { ...validFlashcard, id: 'fc2', term: 'Attention' },
      ];
      const result = FlashcardArraySchema.safeParse(flashcards);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('validateQuestion helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateQuestion(validMultipleChoice);
      expect(result.type).toBe('multiple_choice');
    });

    it('should throw for invalid input', () => {
      expect(() => validateQuestion({ type: 'invalid' })).toThrow();
    });
  });

  describe('safeParseQuestion helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseQuestion(validOrdering);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseQuestion({ type: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCheckpoint helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateCheckpoint(validCheckpoint);
      expect(result.id).toBe('cp1');
    });

    it('should throw for invalid input', () => {
      expect(() => validateCheckpoint({ id: '' })).toThrow();
    });
  });

  describe('safeParseCheckpoint helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseCheckpoint(validCheckpoint);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseCheckpoint({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateFlashcard helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateFlashcard(validFlashcard);
      expect(result.id).toBe('fc1');
    });

    it('should throw for invalid input', () => {
      expect(() => validateFlashcard({ id: '' })).toThrow();
    });
  });

  describe('safeParseFlashcard helper', () => {
    it('should return success for valid input', () => {
      const result = safeParseFlashcard(validFlashcard);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseFlashcard({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Type Guard Tests
  // ==========================================================================

  describe('Type guards', () => {
    const questions: Question[] = [
      validMultipleChoice,
      validOrdering,
      validMatching,
      validExplainBack,
    ];

    it('isMultipleChoice should identify multiple choice questions', () => {
      expect(isMultipleChoice(validMultipleChoice)).toBe(true);
      expect(isMultipleChoice(validOrdering)).toBe(false);
    });

    it('isOrdering should identify ordering questions', () => {
      expect(isOrdering(validOrdering)).toBe(true);
      expect(isOrdering(validMultipleChoice)).toBe(false);
    });

    it('isMatching should identify matching questions', () => {
      expect(isMatching(validMatching)).toBe(true);
      expect(isMatching(validOrdering)).toBe(false);
    });

    it('isExplainBack should identify explain back questions', () => {
      expect(isExplainBack(validExplainBack)).toBe(true);
      expect(isExplainBack(validMatching)).toBe(false);
    });

    it('type guards should work with array filtering', () => {
      const multipleChoiceQuestions = questions.filter(isMultipleChoice);
      expect(multipleChoiceQuestions).toHaveLength(1);
      expect(multipleChoiceQuestions[0].type).toBe('multiple_choice');
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe('Constants', () => {
    it('QUESTION_TYPES should contain all question types', () => {
      expect(QUESTION_TYPES).toEqual([
        'multiple_choice',
        'ordering',
        'matching',
        'explain_back',
      ]);
    });
  });
});
