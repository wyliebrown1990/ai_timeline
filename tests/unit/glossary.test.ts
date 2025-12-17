import {
  GlossaryEntrySchema,
  GlossaryEntryArraySchema,
  GlossaryCategorySchema,
  validateGlossaryEntry,
  safeParseGlossaryEntry,
  GLOSSARY_CATEGORIES,
  GLOSSARY_CATEGORY_LABELS,
  type GlossaryEntry,
  type GlossaryCategory,
} from '../../src/types/glossary';

describe('Glossary Types and Validation', () => {
  // Valid glossary entry fixture for tests
  const validGlossaryEntry: GlossaryEntry = {
    id: 'transformer',
    term: 'Transformer',
    shortDefinition: 'A neural network architecture that processes sequences using attention mechanisms.',
    fullDefinition: 'A Transformer is a deep learning architecture introduced in 2017 that revolutionized natural language processing. Unlike earlier models that processed text sequentially, Transformers can analyze entire sequences at once using a mechanism called self-attention.',
    businessContext: 'Transformers power most modern AI assistants and language tools, including ChatGPT, Claude, and Google Bard.',
    inMeetingExample: "We're evaluating transformer-based solutions for our customer service automation.",
    example: 'When you use ChatGPT or Google Translate, you are using a transformer model.',
    relatedTermIds: ['attention', 'self-attention', 'llm'],
    relatedMilestoneIds: ['E2017_TRANSFORMER'],
    category: 'model_architecture',
  };

  describe('GlossaryCategorySchema', () => {
    it('should accept all valid categories', () => {
      expect(GlossaryCategorySchema.safeParse('core_concept').success).toBe(true);
      expect(GlossaryCategorySchema.safeParse('technical_term').success).toBe(true);
      expect(GlossaryCategorySchema.safeParse('business_term').success).toBe(true);
      expect(GlossaryCategorySchema.safeParse('model_architecture').success).toBe(true);
      expect(GlossaryCategorySchema.safeParse('company_product').success).toBe(true);
    });

    it('should reject invalid categories', () => {
      expect(GlossaryCategorySchema.safeParse('invalid').success).toBe(false);
      expect(GlossaryCategorySchema.safeParse('').success).toBe(false);
      expect(GlossaryCategorySchema.safeParse('CORE_CONCEPT').success).toBe(false);
    });
  });

  describe('GlossaryEntrySchema', () => {
    it('should validate a complete glossary entry', () => {
      const result = GlossaryEntrySchema.safeParse(validGlossaryEntry);
      expect(result.success).toBe(true);
    });

    it('should validate entry without optional fields', () => {
      const minimalEntry = {
        id: 'test-term',
        term: 'Test Term',
        shortDefinition: 'A short definition.',
        fullDefinition: 'A full definition of the test term.',
        businessContext: 'Why this matters in business.',
        category: 'core_concept',
      };
      const result = GlossaryEntrySchema.safeParse(minimalEntry);
      expect(result.success).toBe(true);
    });

    it('should default relatedTermIds to empty array', () => {
      const { relatedTermIds: _related, ...entryWithoutRelated } = validGlossaryEntry;
      const result = GlossaryEntrySchema.safeParse(entryWithoutRelated);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relatedTermIds).toEqual([]);
      }
    });

    it('should default relatedMilestoneIds to empty array', () => {
      const { relatedMilestoneIds: _related, ...entryWithoutMilestones } = validGlossaryEntry;
      const result = GlossaryEntrySchema.safeParse(entryWithoutMilestones);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relatedMilestoneIds).toEqual([]);
      }
    });

    describe('id field', () => {
      it('should reject empty id', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          id: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('term field', () => {
      it('should reject empty term', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          term: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject term over 100 characters', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          term: 'A'.repeat(101),
        });
        expect(result.success).toBe(false);
      });

      it('should accept term at exactly 100 characters', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          term: 'A'.repeat(100),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('shortDefinition field', () => {
      it('should reject shortDefinition over 200 characters', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          shortDefinition: 'A'.repeat(201),
        });
        expect(result.success).toBe(false);
      });

      it('should accept shortDefinition at exactly 200 characters', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          shortDefinition: 'A'.repeat(200),
        });
        expect(result.success).toBe(true);
      });

      it('should accept empty shortDefinition', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          shortDefinition: '',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('fullDefinition field', () => {
      it('should reject empty fullDefinition', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          fullDefinition: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('businessContext field', () => {
      it('should reject empty businessContext', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          businessContext: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('optional fields', () => {
      it('should allow undefined inMeetingExample', () => {
        const { inMeetingExample: _example, ...entry } = validGlossaryEntry;
        const result = GlossaryEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });

      it('should allow undefined example', () => {
        const { example: _example, ...entry } = validGlossaryEntry;
        const result = GlossaryEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });
    });

    describe('category field', () => {
      it('should accept all valid categories', () => {
        for (const category of GLOSSARY_CATEGORIES) {
          const result = GlossaryEntrySchema.safeParse({
            ...validGlossaryEntry,
            category,
          });
          expect(result.success).toBe(true);
        }
      });

      it('should reject invalid category', () => {
        const result = GlossaryEntrySchema.safeParse({
          ...validGlossaryEntry,
          category: 'invalid_category',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('GlossaryEntryArraySchema', () => {
    it('should validate an array of glossary entries', () => {
      const entries: GlossaryEntry[] = [
        validGlossaryEntry,
        {
          ...validGlossaryEntry,
          id: 'attention',
          term: 'Attention',
        },
      ];
      const result = GlossaryEntryArraySchema.safeParse(entries);
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = GlossaryEntryArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should reject array with invalid entry', () => {
      const entries = [
        validGlossaryEntry,
        { ...validGlossaryEntry, id: '' },
      ];
      const result = GlossaryEntryArraySchema.safeParse(entries);
      expect(result.success).toBe(false);
    });
  });

  describe('validateGlossaryEntry helper', () => {
    it('should return parsed data for valid input', () => {
      const result = validateGlossaryEntry(validGlossaryEntry);
      expect(result.id).toBe('transformer');
      expect(result.term).toBe('Transformer');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateGlossaryEntry({ ...validGlossaryEntry, id: '' });
      }).toThrow();
    });
  });

  describe('safeParseGlossaryEntry helper', () => {
    it('should return success result for valid input', () => {
      const result = safeParseGlossaryEntry(validGlossaryEntry);
      expect(result.success).toBe(true);
    });

    it('should return failure result for invalid input', () => {
      const result = safeParseGlossaryEntry({ ...validGlossaryEntry, id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('Constants', () => {
    it('GLOSSARY_CATEGORIES should contain all categories', () => {
      expect(GLOSSARY_CATEGORIES).toEqual([
        'core_concept',
        'technical_term',
        'business_term',
        'model_architecture',
        'company_product',
      ]);
    });

    it('GLOSSARY_CATEGORY_LABELS should have labels for all categories', () => {
      expect(Object.keys(GLOSSARY_CATEGORY_LABELS)).toHaveLength(5);
      expect(GLOSSARY_CATEGORY_LABELS.core_concept).toBe('Core Concept');
      expect(GLOSSARY_CATEGORY_LABELS.technical_term).toBe('Technical Term');
      expect(GLOSSARY_CATEGORY_LABELS.business_term).toBe('Business Term');
      expect(GLOSSARY_CATEGORY_LABELS.model_architecture).toBe('Model Architecture');
      expect(GLOSSARY_CATEGORY_LABELS.company_product).toBe('Company/Product');
    });
  });

  describe('Type inference', () => {
    it('should correctly infer GlossaryCategory type', () => {
      const category: GlossaryCategory = 'core_concept';
      expect(GLOSSARY_CATEGORIES).toContain(category);
    });
  });
});
