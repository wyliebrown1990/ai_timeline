/**
 * AI Learning Companion System Prompts
 * Contains all prompt templates for different explanation modes
 */

import type { ExplainMode, MilestoneContext } from '../types/chat';

/**
 * Base system prompt establishing the AI companion's role and guidelines
 */
const BASE_SYSTEM_PROMPT = `You are an AI learning assistant helping professionals understand AI history and concepts.

Your audience is business professionals - executives, product managers, marketers - who want to understand AI without getting lost in technical details.

Guidelines:
- Explain concepts in plain English first
- Use analogies to familiar business concepts
- Connect historical events to current AI products
- When asked "why does this matter?", focus on business impact
- Only go technical if explicitly asked
- Keep responses concise (2-3 paragraphs max)
- Be accurate and cite specific facts when relevant`;

/**
 * Mode-specific prompt additions that tailor the explanation style
 */
const MODE_PROMPTS: Record<ExplainMode, string> = {
  plain_english: `
Focus on clarity and simplicity. Avoid jargon entirely. If you must use a technical term, immediately explain it in everyday language.`,

  for_boss: `
Explain this as if presenting to an executive. Focus on:
- Business impact and ROI implications
- Competitive landscape changes
- Strategic opportunities and risks
- Timeline and market adoption
Keep it brief - executives are busy.`,

  technical: `
Provide technical depth for this explanation. Include:
- Specific architectures and algorithms involved
- Key papers and their contributions
- Implementation details where relevant
- Comparisons with alternative approaches
Assume familiarity with machine learning fundamentals.`,

  interview: `
Format this as if preparing for a job interview. Provide:
- A concise 2-3 sentence definition
- One concrete example
- Why it matters in practice
- One interesting follow-up fact that shows depth of knowledge`,
};

/**
 * Template for injecting milestone context into the conversation
 */
function buildMilestoneContextPrompt(context: MilestoneContext): string {
  let prompt = `
The user is currently viewing the following milestone:

Title: ${context.title}
Date: ${context.date}
Description: ${context.description}`;

  if (context.category) {
    prompt += `\nCategory: ${context.category}`;
  }

  if (context.tags && context.tags.length > 0) {
    prompt += `\nTopics: ${context.tags.join(', ')}`;
  }

  prompt += `

Help the user understand this milestone and its significance in AI history. If they ask about related concepts, connect them back to this milestone when relevant.`;

  return prompt;
}

/**
 * Builds the complete system prompt based on mode and optional milestone context
 */
export function buildSystemPrompt(
  mode: ExplainMode = 'plain_english',
  milestoneContext?: MilestoneContext
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Add mode-specific instructions
  prompt += MODE_PROMPTS[mode];

  // Add milestone context if provided
  if (milestoneContext) {
    prompt += buildMilestoneContextPrompt(milestoneContext);
  }

  return prompt;
}

/**
 * Generates suggested follow-up questions based on the conversation
 * These help users explore topics more deeply
 */
export function generateFollowUpPrompt(topic: string): string {
  return `Based on the conversation about "${topic}", suggest 2-3 concise follow-up questions the user might want to ask. Format them as a JSON array of strings. Only output the JSON array, nothing else.`;
}

/**
 * Prompt for identifying prerequisite concepts
 */
export function generatePrerequisitePrompt(concept: string): string {
  return `For someone trying to understand "${concept}", what 2-3 foundational concepts should they understand first? List only essential prerequisites that are necessary for comprehension. Format as a JSON array of objects with "name" and "reason" properties. Only output the JSON array.`;
}
