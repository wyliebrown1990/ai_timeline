/**
 * System Prompts Tests
 */

import { buildSystemPrompt, generateFollowUpPrompt, generatePrerequisitePrompt } from '../../../server/src/prompts';
import type { MilestoneContext } from '../../../server/src/types/chat';

describe('System Prompts', () => {
  describe('buildSystemPrompt', () => {
    it('should include base prompt content', () => {
      const prompt = buildSystemPrompt();

      expect(prompt).toContain('AI learning assistant');
      expect(prompt).toContain('business professionals');
      expect(prompt).toContain('plain English');
    });

    it('should include plain english mode by default', () => {
      const prompt = buildSystemPrompt();

      expect(prompt).toContain('clarity and simplicity');
      expect(prompt).toContain('Avoid jargon');
    });

    it('should include for_boss mode instructions when specified', () => {
      const prompt = buildSystemPrompt('for_boss');

      expect(prompt).toContain('executive');
      expect(prompt).toContain('Business impact');
      expect(prompt).toContain('ROI');
    });

    it('should include technical mode instructions when specified', () => {
      const prompt = buildSystemPrompt('technical');

      expect(prompt).toContain('technical depth');
      expect(prompt).toContain('architectures');
      expect(prompt).toContain('algorithms');
    });

    it('should include interview mode instructions when specified', () => {
      const prompt = buildSystemPrompt('interview');

      expect(prompt).toContain('job interview');
      expect(prompt).toContain('concise');
      expect(prompt).toContain('concrete example');
    });

    it('should include milestone context when provided', () => {
      const context: MilestoneContext = {
        id: 'E2017_TRANSFORMER',
        title: 'Transformer Architecture',
        description: 'Attention is all you need paper published',
        date: '2017-06-12',
        category: 'paper',
        tags: ['NLP', 'Deep Learning'],
      };

      const prompt = buildSystemPrompt('plain_english', context);

      expect(prompt).toContain('Transformer Architecture');
      expect(prompt).toContain('2017-06-12');
      expect(prompt).toContain('Attention is all you need');
      expect(prompt).toContain('NLP, Deep Learning');
    });

    it('should handle milestone context without optional fields', () => {
      const context: MilestoneContext = {
        id: 'E2020_GPT3',
        title: 'GPT-3',
        description: 'OpenAI releases GPT-3',
        date: '2020-05-28',
      };

      const prompt = buildSystemPrompt('plain_english', context);

      expect(prompt).toContain('GPT-3');
      expect(prompt).toContain('2020-05-28');
      expect(prompt).not.toContain('Category:');
      expect(prompt).not.toContain('Topics:');
    });
  });

  describe('generateFollowUpPrompt', () => {
    it('should include the topic in the prompt', () => {
      const prompt = generateFollowUpPrompt('transformers');

      expect(prompt).toContain('transformers');
      expect(prompt).toContain('follow-up questions');
      expect(prompt).toContain('JSON array');
    });
  });

  describe('generatePrerequisitePrompt', () => {
    it('should include the concept in the prompt', () => {
      const prompt = generatePrerequisitePrompt('attention mechanism');

      expect(prompt).toContain('attention mechanism');
      expect(prompt).toContain('foundational concepts');
      expect(prompt).toContain('JSON array');
    });
  });
});
