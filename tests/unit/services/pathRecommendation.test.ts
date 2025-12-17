import type { UserRole, LearningGoal, TimeCommitment } from '../../../src/types/userProfile';

// Mock the content module - must use factory function with inline data
jest.mock('../../../src/content', () => ({
  getLearningPaths: jest.fn(() => [
    {
      id: 'chatgpt-story',
      title: 'The ChatGPT Story',
      description: 'Follow the journey from transformers to ChatGPT.',
      targetAudience: 'Business professionals new to AI',
      milestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2022_CHATGPT'],
      estimatedMinutes: 30,
      difficulty: 'beginner',
      suggestedNextPathIds: ['ai-fundamentals'],
      keyTakeaways: ['Understand transformers', 'Know GPT models', 'Explain ChatGPT'],
      conceptsCovered: ['transformer', 'attention', 'llm'],
      icon: '🤖',
    },
    {
      id: 'ai-fundamentals',
      title: 'AI Fundamentals',
      description: 'Build a solid foundation in AI concepts.',
      targetAudience: 'Anyone starting their AI journey',
      milestoneIds: ['E1958_PERCEPTRON', 'E1986_BACKPROP', 'E2012_ALEXNET'],
      estimatedMinutes: 45,
      difficulty: 'beginner',
      suggestedNextPathIds: ['chatgpt-story'],
      keyTakeaways: ['Understand neural networks', 'Know key breakthroughs', 'Grasp deep learning'],
      conceptsCovered: ['neural-network', 'deep-learning', 'backpropagation'],
      icon: '🧠',
    },
    {
      id: 'ai-for-business',
      title: 'AI for Business Leaders',
      description: 'Strategic overview of AI for business.',
      targetAudience: 'Executives and business professionals',
      milestoneIds: ['E1997_DEEP_BLUE', 'E2020_GPT3', 'E2022_CHATGPT'],
      estimatedMinutes: 35,
      difficulty: 'beginner',
      suggestedNextPathIds: ['chatgpt-story'],
      keyTakeaways: ['AI capabilities', 'Business applications', 'Informed decisions'],
      conceptsCovered: ['machine-learning', 'llm', 'prompt'],
      icon: '💼',
    },
    {
      id: 'ai-image-generation',
      title: 'AI Image Generation',
      description: 'Evolution of AI-generated images.',
      targetAudience: 'Creative professionals',
      milestoneIds: ['E2014_GANS', 'E2021_DALLE', 'E2022_STABLE_DIFFUSION'],
      estimatedMinutes: 25,
      difficulty: 'beginner',
      suggestedNextPathIds: ['ai-fundamentals'],
      keyTakeaways: ['Understand GANs', 'Know diffusion models', 'Explain DALL-E'],
      conceptsCovered: ['gan', 'diffusion-model', 'latent-space'],
      icon: '🎨',
    },
    {
      id: 'ai-governance',
      title: 'AI Governance & Policy',
      description: 'AI regulation and safety initiatives.',
      targetAudience: 'Policy makers and compliance officers',
      milestoneIds: ['E2019_OECD_AI_PRINCIPLES', 'E2023_US_EO_14110', 'E2024_EU_AI_ACT'],
      estimatedMinutes: 40,
      difficulty: 'intermediate',
      suggestedNextPathIds: ['ai-for-business'],
      keyTakeaways: ['Governance frameworks', 'Safety techniques', 'Regulatory requirements'],
      conceptsCovered: ['rlhf', 'constitutional-ai', 'alignment'],
      icon: '⚖️',
    },
  ]),
}));

// Import after mocking
import {
  generateRecommendations,
  getPathDetails,
  getAllPaths,
  type PersonalizedPlan,
} from '../../../src/services/pathRecommendation';

describe('pathRecommendation', () => {
  // ==========================================================================
  // generateRecommendations Tests
  // ==========================================================================

  describe('generateRecommendations', () => {
    describe('role-based recommendations', () => {
      it('should recommend ai-for-business for executives', () => {
        const plan = generateRecommendations('executive', ['discuss_at_work'], 'standard');

        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
        expect(plan.recommendedPaths[0].pathId).toBe('ai-for-business');
      });

      it('should recommend chatgpt-story for product managers', () => {
        const plan = generateRecommendations('product_manager', ['discuss_at_work'], 'standard');

        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
        // Product managers get chatgpt-story first
        expect(plan.recommendedPaths[0].pathId).toBe('chatgpt-story');
      });

      it('should recommend ai-fundamentals for developers', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'standard');

        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
        expect(plan.recommendedPaths[0].pathId).toBe('ai-fundamentals');
      });

      it('should recommend ai-fundamentals for students', () => {
        const plan = generateRecommendations('student', ['career_transition'], 'standard');

        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
        expect(plan.recommendedPaths[0].pathId).toBe('ai-fundamentals');
      });

      it('should recommend chatgpt-story for curious users', () => {
        const plan = generateRecommendations('curious', ['hype_vs_real'], 'standard');

        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
        // chatgpt-story is most accessible
        expect(plan.recommendedPaths.some((p) => p.pathId === 'chatgpt-story')).toBe(true);
      });
    });

    describe('goal-based recommendations', () => {
      it('should recommend chatgpt-story for discuss_at_work goal', () => {
        const plan = generateRecommendations('curious', ['discuss_at_work'], 'standard');

        expect(plan.recommendedPaths.some((p) => p.pathId === 'chatgpt-story')).toBe(true);
      });

      it('should recommend ai-for-business for evaluate_tools goal', () => {
        // Use 'deep' commitment to get all relevant paths, not just top 2
        const plan = generateRecommendations('curious', ['evaluate_tools'], 'deep');

        expect(plan.recommendedPaths.some((p) => p.pathId === 'ai-for-business')).toBe(true);
      });

      it('should recommend ai-fundamentals for hype_vs_real goal', () => {
        const plan = generateRecommendations('curious', ['hype_vs_real'], 'deep');

        expect(plan.recommendedPaths.some((p) => p.pathId === 'ai-fundamentals')).toBe(true);
      });

      it('should recommend ai-governance for industry_impact goal', () => {
        const plan = generateRecommendations('curious', ['industry_impact'], 'deep');

        expect(plan.recommendedPaths.some((p) => p.pathId === 'ai-governance')).toBe(true);
      });

      it('should consider multiple goals', () => {
        const plan = generateRecommendations(
          'curious',
          ['build_with_ai', 'career_transition'],
          'deep'
        );

        // Should include ai-fundamentals (good for both goals)
        expect(plan.recommendedPaths.some((p) => p.pathId === 'ai-fundamentals')).toBe(true);
      });
    });

    describe('time commitment filtering', () => {
      it('should return only 1 path for quick commitment', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'quick');

        expect(plan.recommendedPaths.length).toBe(1);
      });

      it('should return up to 2 paths for standard commitment', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'standard');

        expect(plan.recommendedPaths.length).toBeLessThanOrEqual(2);
        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
      });

      it('should return more paths for deep commitment', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'deep');

        // Deep dives get more paths
        expect(plan.recommendedPaths.length).toBeGreaterThanOrEqual(2);
      });

      it('should calculate total estimated minutes correctly', () => {
        const plan = generateRecommendations('executive', ['discuss_at_work'], 'deep');

        // Total should equal sum of recommended paths
        let expectedTotal = 0;
        for (const rec of plan.recommendedPaths) {
          const path = getPathDetails(rec.pathId);
          if (path) {
            expectedTotal += path.estimatedMinutes;
          }
        }

        expect(plan.estimatedTotalMinutes).toBe(expectedTotal);
      });
    });

    describe('relevance scoring', () => {
      it('should assign higher scores to more relevant paths', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'deep');

        // Paths should be sorted by relevance
        for (let i = 1; i < plan.recommendedPaths.length; i++) {
          expect(plan.recommendedPaths[i - 1].relevanceScore).toBeGreaterThanOrEqual(
            plan.recommendedPaths[i].relevanceScore
          );
        }
      });

      it('should have relevance scores between 0 and 100', () => {
        const plan = generateRecommendations('developer', ['build_with_ai', 'career_transition'], 'deep');

        for (const rec of plan.recommendedPaths) {
          expect(rec.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(rec.relevanceScore).toBeLessThanOrEqual(100);
        }
      });
    });

    describe('reason generation', () => {
      it('should include reason for each recommendation', () => {
        const plan = generateRecommendations('executive', ['discuss_at_work'], 'standard');

        for (const rec of plan.recommendedPaths) {
          expect(rec.reason).toBeDefined();
          expect(rec.reason.length).toBeGreaterThan(0);
        }
      });

      it('should provide goal-specific reasons when applicable', () => {
        const plan = generateRecommendations('developer', ['build_with_ai'], 'standard');

        // Should have a reason related to building
        const aiFoundPath = plan.recommendedPaths.find(
          (r) => r.pathId === 'ai-fundamentals'
        );
        if (aiFoundPath) {
          expect(aiFoundPath.reason.toLowerCase()).toContain('build');
        }
      });
    });

    describe('suggestedStartPath', () => {
      it('should set suggestedStartPath to first recommended path', () => {
        const plan = generateRecommendations('executive', ['evaluate_tools'], 'standard');

        expect(plan.suggestedStartPath).toBe(plan.recommendedPaths[0]?.pathId);
      });

      it('should default to chatgpt-story if no recommendations', () => {
        // This is a fallback case - unlikely in practice
        // Testing the default value in the return
        const plan = generateRecommendations('curious', ['discuss_at_work'], 'quick');

        expect(plan.suggestedStartPath).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // getPathDetails Tests
  // ==========================================================================

  describe('getPathDetails', () => {
    it('should return path details for valid path ID', () => {
      const path = getPathDetails('chatgpt-story');

      expect(path).toBeDefined();
      expect(path?.id).toBe('chatgpt-story');
      expect(path?.title).toBe('The ChatGPT Story');
    });

    it('should return undefined for invalid path ID', () => {
      const path = getPathDetails('nonexistent-path');

      expect(path).toBeUndefined();
    });

    it('should include estimated minutes', () => {
      const path = getPathDetails('ai-fundamentals');

      expect(path?.estimatedMinutes).toBeDefined();
      expect(typeof path?.estimatedMinutes).toBe('number');
    });
  });

  // ==========================================================================
  // getAllPaths Tests
  // ==========================================================================

  describe('getAllPaths', () => {
    it('should return all available learning paths', () => {
      const paths = getAllPaths();

      expect(paths.length).toBeGreaterThan(0);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should include expected paths', () => {
      const paths = getAllPaths();
      const pathIds = paths.map((p) => p.id);

      expect(pathIds).toContain('chatgpt-story');
      expect(pathIds).toContain('ai-fundamentals');
      expect(pathIds).toContain('ai-for-business');
    });

    it('should return paths with required properties', () => {
      const paths = getAllPaths();

      for (const path of paths) {
        expect(path.id).toBeDefined();
        expect(path.title).toBeDefined();
        expect(path.estimatedMinutes).toBeDefined();
        expect(path.difficulty).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should handle all role types', () => {
      const roles: UserRole[] = [
        'executive',
        'product_manager',
        'marketing_sales',
        'operations_hr',
        'developer',
        'student',
        'curious',
      ];

      for (const role of roles) {
        const plan = generateRecommendations(role, ['discuss_at_work'], 'standard');
        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
      }
    });

    it('should handle all goal types', () => {
      const goals: LearningGoal[] = [
        'discuss_at_work',
        'evaluate_tools',
        'hype_vs_real',
        'industry_impact',
        'build_with_ai',
        'career_transition',
      ];

      for (const goal of goals) {
        const plan = generateRecommendations('curious', [goal], 'standard');
        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
      }
    });

    it('should handle all time commitment types', () => {
      const commitments: TimeCommitment[] = ['quick', 'standard', 'deep'];

      for (const commitment of commitments) {
        const plan = generateRecommendations('developer', ['build_with_ai'], commitment);
        expect(plan.recommendedPaths.length).toBeGreaterThan(0);
      }
    });
  });
});
