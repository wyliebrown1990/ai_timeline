import {
  MilestoneCategory,
  SignificanceLevel,
  SourceKind,
  CreateMilestoneDtoSchema,
  UpdateMilestoneDtoSchema,
  MilestoneResponseSchema,
  SourceSchema,
  MilestoneLayeredContentSchema,
  MilestoneWithLayeredContentSchema,
  LayeredContentMapSchema,
  validateLayeredContent,
  safeParseLayeredContent,
  type MilestoneLayeredContent,
} from '../../src/types/milestone';

describe('Milestone Types and Validation', () => {
  describe('MilestoneCategory enum', () => {
    it('should have all expected categories', () => {
      expect(MilestoneCategory.RESEARCH).toBe('research');
      expect(MilestoneCategory.MODEL_RELEASE).toBe('model_release');
      expect(MilestoneCategory.BREAKTHROUGH).toBe('breakthrough');
      expect(MilestoneCategory.PRODUCT).toBe('product');
      expect(MilestoneCategory.REGULATION).toBe('regulation');
      expect(MilestoneCategory.INDUSTRY).toBe('industry');
    });
  });

  describe('SignificanceLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(SignificanceLevel.MINOR).toBe(1);
      expect(SignificanceLevel.MODERATE).toBe(2);
      expect(SignificanceLevel.MAJOR).toBe(3);
      expect(SignificanceLevel.GROUNDBREAKING).toBe(4);
    });
  });

  describe('SourceKind enum', () => {
    it('should have all source types', () => {
      expect(SourceKind.PAPER).toBe('paper');
      expect(SourceKind.PRIMARY_DOC).toBe('primary_doc');
      expect(SourceKind.BOOK).toBe('book');
      expect(SourceKind.CODE_REPO).toBe('code_repo');
      expect(SourceKind.MEDIA).toBe('media');
      expect(SourceKind.ARTICLE).toBe('article');
    });
  });

  describe('SourceSchema validation', () => {
    it('should validate a valid source', () => {
      const validSource = {
        label: 'Research Paper',
        kind: 'paper',
        url: 'https://example.com/paper.pdf',
      };
      expect(SourceSchema.safeParse(validSource).success).toBe(true);
    });

    it('should reject source with invalid URL', () => {
      const invalidSource = {
        label: 'Bad Link',
        kind: 'paper',
        url: 'not-a-valid-url',
      };
      expect(SourceSchema.safeParse(invalidSource).success).toBe(false);
    });

    it('should reject source with empty label', () => {
      const invalidSource = {
        label: '',
        kind: 'paper',
        url: 'https://example.com',
      };
      expect(SourceSchema.safeParse(invalidSource).success).toBe(false);
    });
  });

  describe('CreateMilestoneDtoSchema validation', () => {
    const validMilestone = {
      title: 'GPT-4 Release',
      description: 'OpenAI releases GPT-4, a large multimodal model.',
      date: '2023-03-14',
      category: MilestoneCategory.MODEL_RELEASE,
      significance: SignificanceLevel.GROUNDBREAKING,
      era: 'LLM Era',
      tags: ['llm', 'openai', 'multimodal'],
    };

    it('should validate a valid milestone creation request', () => {
      const result = CreateMilestoneDtoSchema.safeParse(validMilestone);
      expect(result.success).toBe(true);
    });

    it('should reject milestone with missing title', () => {
      const { title: _title, ...noTitle } = validMilestone;
      const result = CreateMilestoneDtoSchema.safeParse(noTitle);
      expect(result.success).toBe(false);
    });

    it('should reject milestone with empty title', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        title: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject milestone with invalid date', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        date: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept date with year only format', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        date: '2023',
      });
      expect(result.success).toBe(true);
    });

    it('should accept date with year-month format', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        date: '2023-03',
      });
      expect(result.success).toBe(true);
    });

    it('should reject milestone with invalid category', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        category: 'invalid_category',
      });
      expect(result.success).toBe(false);
    });

    it('should reject milestone with invalid significance', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        significance: 5,
      });
      expect(result.success).toBe(false);
    });

    it('should validate milestone with optional fields', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        organization: 'OpenAI',
        contributors: ['Sam Altman', 'Greg Brockman'],
        sourceUrl: 'https://openai.com/gpt-4',
        imageUrl: 'https://example.com/gpt4.png',
        sources: [
          {
            label: 'Official Blog',
            kind: 'primary_doc',
            url: 'https://openai.com/blog',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty string for sourceUrl', () => {
      const result = CreateMilestoneDtoSchema.safeParse({
        ...validMilestone,
        sourceUrl: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateMilestoneDtoSchema validation', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        title: 'Updated Title',
      };
      const result = UpdateMilestoneDtoSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate empty object (no updates)', () => {
      const result = UpdateMilestoneDtoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should still validate field types on partial updates', () => {
      const result = UpdateMilestoneDtoSchema.safeParse({
        significance: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MilestoneResponseSchema validation', () => {
    it('should validate a full milestone response', () => {
      const response = {
        id: 'clx123abc',
        title: 'Transformer Architecture',
        description: 'Attention is all you need paper introduces transformers.',
        date: '2017-06-12T00:00:00.000Z',
        category: MilestoneCategory.BREAKTHROUGH,
        significance: SignificanceLevel.GROUNDBREAKING,
        era: 'Transformers',
        organization: 'Google',
        contributors: ['Vaswani et al.'],
        sourceUrl: 'https://arxiv.org/abs/1706.03762',
        imageUrl: null,
        tags: ['transformer', 'attention', 'nlp'],
        sources: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = MilestoneResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should handle nullable optional fields', () => {
      const response = {
        id: 'clx123abc',
        title: 'Test',
        description: 'Test description',
        date: '2020-01-01',
        category: MilestoneCategory.RESEARCH,
        significance: SignificanceLevel.MINOR,
        era: null,
        organization: null,
        contributors: [],
        sourceUrl: null,
        imageUrl: null,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = MilestoneResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Layered Content Schema Tests (Sprint 8.5 Addition)
  // ===========================================================================

  describe('MilestoneLayeredContentSchema validation', () => {
    const validLayeredContent: MilestoneLayeredContent = {
      tldr: 'Transformers revolutionized AI by enabling parallel processing of sequences.',
      simpleExplanation: 'Imagine reading a book where you can see all pages at once instead of one at a time. Transformers work similarly - they can look at all parts of a sentence simultaneously, making them much faster and smarter at understanding language.',
      businessImpact: '- Enabled practical AI assistants like ChatGPT and Claude\n- Reduced translation costs by 90%\n- Powers customer service automation across industries\n- Made AI accessible to non-technical businesses',
      technicalDepth: 'The Transformer architecture uses self-attention mechanisms to compute relationships between all positions in a sequence simultaneously. Unlike RNNs which process sequences step-by-step, Transformers achieve O(1) sequential operations. The architecture consists of encoder and decoder stacks, each with multi-head attention and feed-forward layers.',
      historicalContext: 'Before Transformers, NLP relied on RNNs and LSTMs which suffered from vanishing gradients and slow sequential processing. The attention mechanism was introduced in 2014 for machine translation, but required recurrent architectures. The 2017 paper showed attention alone was sufficient.',
      whyItMattersToday: 'Every modern AI assistant you use - from ChatGPT to Siri to Google Search - is powered by Transformers.',
      commonMisconceptions: '❌ "Transformers are only for text" → ✅ They now power vision (ViT), audio, and multimodal models\n❌ "Bigger is always better" → ✅ Architecture and training data quality matter more than size alone',
    };

    it('should validate valid layered content', () => {
      const result = MilestoneLayeredContentSchema.safeParse(validLayeredContent);
      expect(result.success).toBe(true);
    });

    it('should reject tldr over 100 characters', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        tldr: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should accept tldr at exactly 100 characters', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        tldr: 'A'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('should reject whyItMattersToday over 300 characters', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        whyItMattersToday: 'A'.repeat(301),
      });
      expect(result.success).toBe(false);
    });

    it('should accept whyItMattersToday at exactly 300 characters', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        whyItMattersToday: 'A'.repeat(300),
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty simpleExplanation', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        simpleExplanation: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty businessImpact', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        businessImpact: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty technicalDepth', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        technicalDepth: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty historicalContext', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        historicalContext: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty commonMisconceptions', () => {
      const result = MilestoneLayeredContentSchema.safeParse({
        ...validLayeredContent,
        commonMisconceptions: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MilestoneWithLayeredContentSchema validation', () => {
    const validResponse = {
      id: 'clx123abc',
      title: 'Transformer Architecture',
      description: 'Attention is all you need.',
      date: '2017-06-12',
      category: MilestoneCategory.BREAKTHROUGH,
      significance: SignificanceLevel.GROUNDBREAKING,
      era: 'Transformers',
      organization: 'Google',
      contributors: [],
      sourceUrl: null,
      imageUrl: null,
      tags: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const validLayeredContent: MilestoneLayeredContent = {
      tldr: 'Transformers enabled modern AI.',
      simpleExplanation: 'A new way for AI to process text.',
      businessImpact: 'Enabled chatbots and assistants.',
      technicalDepth: 'Uses attention mechanisms.',
      historicalContext: 'Built on prior NLP research.',
      whyItMattersToday: 'Powers ChatGPT.',
      commonMisconceptions: 'Not just for text.',
    };

    it('should validate response without layered content', () => {
      const result = MilestoneWithLayeredContentSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate response with layered content', () => {
      const result = MilestoneWithLayeredContentSchema.safeParse({
        ...validResponse,
        layeredContent: validLayeredContent,
      });
      expect(result.success).toBe(true);
    });

    it('should reject response with invalid layered content', () => {
      const result = MilestoneWithLayeredContentSchema.safeParse({
        ...validResponse,
        layeredContent: {
          ...validLayeredContent,
          simpleExplanation: '', // Invalid - empty string
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LayeredContentMapSchema validation', () => {
    const validLayeredContent: MilestoneLayeredContent = {
      tldr: 'Short summary.',
      simpleExplanation: 'Simple explanation here.',
      businessImpact: 'Business impact here.',
      technicalDepth: 'Technical depth here.',
      historicalContext: 'Historical context here.',
      whyItMattersToday: 'Why it matters.',
      commonMisconceptions: 'Common misconceptions.',
    };

    it('should validate empty map', () => {
      const result = LayeredContentMapSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate map with single entry', () => {
      const result = LayeredContentMapSchema.safeParse({
        'E2017_TRANSFORMER': validLayeredContent,
      });
      expect(result.success).toBe(true);
    });

    it('should validate map with multiple entries', () => {
      const result = LayeredContentMapSchema.safeParse({
        'E2017_TRANSFORMER': validLayeredContent,
        'E2020_GPT3': validLayeredContent,
        'E2022_CHATGPT': validLayeredContent,
      });
      expect(result.success).toBe(true);
    });

    it('should reject map with invalid entry', () => {
      const result = LayeredContentMapSchema.safeParse({
        'E2017_TRANSFORMER': validLayeredContent,
        'E2020_GPT3': { ...validLayeredContent, simpleExplanation: '' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateLayeredContent helper', () => {
    const validContent: MilestoneLayeredContent = {
      tldr: 'Summary.',
      simpleExplanation: 'Simple.',
      businessImpact: 'Impact.',
      technicalDepth: 'Technical.',
      historicalContext: 'History.',
      whyItMattersToday: 'Matters.',
      commonMisconceptions: 'Misconceptions.',
    };

    it('should return parsed data for valid input', () => {
      const result = validateLayeredContent(validContent);
      expect(result.tldr).toBe('Summary.');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateLayeredContent({ ...validContent, simpleExplanation: '' });
      }).toThrow();
    });
  });

  describe('safeParseLayeredContent helper', () => {
    const validContent: MilestoneLayeredContent = {
      tldr: 'Summary.',
      simpleExplanation: 'Simple.',
      businessImpact: 'Impact.',
      technicalDepth: 'Technical.',
      historicalContext: 'History.',
      whyItMattersToday: 'Matters.',
      commonMisconceptions: 'Misconceptions.',
    };

    it('should return success for valid input', () => {
      const result = safeParseLayeredContent(validContent);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseLayeredContent({ ...validContent, simpleExplanation: '' });
      expect(result.success).toBe(false);
    });
  });
});
