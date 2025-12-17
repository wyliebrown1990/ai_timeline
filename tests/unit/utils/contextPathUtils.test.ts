/**
 * Context Path Utilities Tests
 *
 * Tests for the context path utility functions used to manage
 * current event context paths.
 */

import {
  generateContextPath,
  saveContextPath,
  loadContextPath,
  clearContextPath,
  hasActiveContextPath,
  calculateEstimatedTime,
  type ContextPath,
} from '../../../src/utils/contextPathUtils';
import type { CurrentEvent } from '../../../src/types/currentEvent';

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockSessionStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockSessionStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  }),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock current event
const mockEvent: CurrentEvent = {
  id: 'test-event-1',
  headline: 'OpenAI Releases GPT-5',
  summary: 'A groundbreaking AI model release.',
  publishedDate: '2024-03-15',
  prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2023_GPT4'],
  connectionExplanation: 'GPT-5 builds on previous GPT models.',
  featured: true,
};

describe('contextPathUtils', () => {
  beforeEach(() => {
    // Clear mock storage and mock calls before each test
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
    jest.clearAllMocks();
  });

  describe('generateContextPath', () => {
    it('generates a context path from event and milestones', () => {
      const milestoneIds = ['E2017_TRANSFORMER', 'E2020_GPT3'];
      const result = generateContextPath(mockEvent, milestoneIds);

      expect(result.newsEventId).toBe('test-event-1');
      expect(result.newsHeadline).toBe('OpenAI Releases GPT-5');
      expect(result.milestoneIds).toEqual(milestoneIds);
      expect(result.title).toBe('Understanding: OpenAI Releases GPT-5');
      expect(result.createdAt).toBeDefined();
    });

    it('calculates estimated time based on milestone count', () => {
      const result = generateContextPath(mockEvent, ['E1', 'E2', 'E3', 'E4']);
      // 4 milestones * 3 minutes each = 12 minutes
      expect(result.estimatedMinutes).toBe(12);
    });

    it('handles empty milestone list', () => {
      const result = generateContextPath(mockEvent, []);
      expect(result.milestoneIds).toEqual([]);
      expect(result.estimatedMinutes).toBe(0);
    });
  });

  describe('saveContextPath', () => {
    it('saves context path to session storage', () => {
      const contextPath: ContextPath = {
        newsEventId: 'test-1',
        newsHeadline: 'Test',
        milestoneIds: ['E1'],
        estimatedMinutes: 3,
        title: 'Test Path',
        createdAt: '2024-01-01',
      };

      saveContextPath(contextPath);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'ai_timeline_context_path',
        JSON.stringify(contextPath)
      );
    });
  });

  describe('loadContextPath', () => {
    it('returns null when no path is saved', () => {
      const result = loadContextPath();
      expect(result).toBeNull();
    });

    it('loads and parses saved context path', () => {
      const contextPath: ContextPath = {
        newsEventId: 'test-1',
        newsHeadline: 'Test',
        milestoneIds: ['E1'],
        estimatedMinutes: 3,
        title: 'Test Path',
        createdAt: '2024-01-01',
      };
      mockSessionStorage['ai_timeline_context_path'] = JSON.stringify(contextPath);

      const result = loadContextPath();

      expect(result).toEqual(contextPath);
    });

    it('returns null for invalid JSON', () => {
      mockSessionStorage['ai_timeline_context_path'] = 'invalid json';

      const result = loadContextPath();

      expect(result).toBeNull();
    });
  });

  describe('clearContextPath', () => {
    it('removes context path from session storage', () => {
      mockSessionStorage['ai_timeline_context_path'] = '{}';

      clearContextPath();

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        'ai_timeline_context_path'
      );
    });
  });

  describe('hasActiveContextPath', () => {
    it('returns false when no path is saved', () => {
      expect(hasActiveContextPath()).toBe(false);
    });

    it('returns true when path is saved', () => {
      mockSessionStorage['ai_timeline_context_path'] = '{}';

      expect(hasActiveContextPath()).toBe(true);
    });
  });

  describe('calculateEstimatedTime', () => {
    it('calculates time based on milestone count', () => {
      expect(calculateEstimatedTime(1)).toBe(3);
      expect(calculateEstimatedTime(5)).toBe(15);
      expect(calculateEstimatedTime(0)).toBe(0);
    });
  });
});
