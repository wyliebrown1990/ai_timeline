import { z } from 'zod';

/**
 * User Profile Types
 *
 * User profiles capture preferences and learning context to personalize
 * the experience. This includes role, goals, time commitment, and
 * preferred explanation depth.
 */

// =============================================================================
// Enum Schemas
// =============================================================================

/**
 * User role - helps determine relevant content and framing
 */
export const UserRoleSchema = z.enum([
  'executive',          // C-level, VP, Director - strategic focus
  'product_manager',    // PM roles - product and feature focus
  'marketing_sales',    // Marketing/Sales - GTM and customer focus
  'operations_hr',      // Operations/HR - process and people focus
  'developer',          // Technical roles - implementation focus
  'student',            // Academic - learning focus
  'everyday_user',      // Everyday person - plain English, practical focus
  'culture_enthusiast', // Interested in AI drama, headlines, cultural impact
  'curious',            // General interest - exploratory focus
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Learning goals - what the user wants to achieve
 */
export const LearningGoalSchema = z.enum([
  'discuss_at_work',    // Confidently discuss AI in meetings
  'evaluate_tools',     // Evaluate AI tools for team/org
  'hype_vs_real',       // Distinguish hype from real capabilities
  'industry_impact',    // Understand industry-specific AI impact
  'build_with_ai',      // Build products/features using AI
  'career_transition',  // Transition career into AI field
  'stay_informed',      // Stay informed about AI developments
  'cultural_impact',    // Understand AI's cultural and social impact
  'protect_family',     // Help family stay safe from AI scams/misuse
]);

export type LearningGoal = z.infer<typeof LearningGoalSchema>;

/**
 * Time commitment preference
 */
export const TimeCommitmentSchema = z.enum([
  'quick',    // 5-10 min sessions
  'standard', // 15-30 min sessions
  'deep',     // 30-60 min deep dives
]);

export type TimeCommitment = z.infer<typeof TimeCommitmentSchema>;

/**
 * Preferred explanation level
 */
export const ExplanationLevelSchema = z.enum([
  'simple',    // No jargon, everyday analogies
  'business',  // Business context and implications
  'technical', // Technical depth with architecture details
]);

export type ExplanationLevel = z.infer<typeof ExplanationLevelSchema>;

/**
 * Audience type - primary user segment for content targeting
 */
export const AudienceTypeSchema = z.enum([
  'everyday',   // General public, 65+, wants plain English
  'leader',     // Executives/managers, wants strategic briefings
  'technical',  // Developers/engineers, wants technical depth
  'general',    // Default, shows all content equally
]);

export type AudienceType = z.infer<typeof AudienceTypeSchema>;

// =============================================================================
// User Profile Schema
// =============================================================================

/**
 * Complete user profile schema
 */
export const UserProfileSchema = z.object({
  // Unique user identifier
  id: z.string().min(1),

  // User's professional role
  role: UserRoleSchema,

  // Primary audience type for content targeting
  audienceType: AudienceTypeSchema.default('general'),

  // User's learning goals (1-3 goals)
  goals: z.array(LearningGoalSchema).min(1).max(3),

  // Preferred session length
  timeCommitment: TimeCommitmentSchema,

  // Preferred depth of explanations
  preferredExplanationLevel: ExplanationLevelSchema,

  // Timestamps
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Schema for creating a new user profile (without timestamps)
 */
export const CreateUserProfileSchema = z.object({
  role: UserRoleSchema,
  audienceType: AudienceTypeSchema.optional().default('general'),
  goals: z.array(LearningGoalSchema).min(1).max(3),
  timeCommitment: TimeCommitmentSchema,
  preferredExplanationLevel: ExplanationLevelSchema,
});

export type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>;

/**
 * Schema for updating a user profile (all fields optional)
 */
export const UpdateUserProfileSchema = CreateUserProfileSchema.partial();

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate a complete user profile
 */
export function validateUserProfile(data: unknown): UserProfile {
  return UserProfileSchema.parse(data);
}

/**
 * Safely validate a user profile
 */
export function safeParseUserProfile(data: unknown) {
  return UserProfileSchema.safeParse(data);
}

/**
 * Validate a create user profile request
 */
export function validateCreateUserProfile(data: unknown): CreateUserProfile {
  return CreateUserProfileSchema.parse(data);
}

/**
 * Safely validate a create user profile request
 */
export function safeParseCreateUserProfile(data: unknown) {
  return CreateUserProfileSchema.safeParse(data);
}

// =============================================================================
// Constants
// =============================================================================

/**
 * All user roles with human-readable labels
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  everyday_user: 'Everyday User',
  culture_enthusiast: 'Culture & Headlines Fan',
  executive: 'Executive / Business Leader',
  product_manager: 'Product Manager',
  marketing_sales: 'Marketing & Sales',
  operations_hr: 'Operations & HR',
  developer: 'Developer / Engineer',
  student: 'Student / Academic',
  curious: 'Just Curious',
};

/**
 * All learning goals with human-readable labels
 */
export const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
  stay_informed: 'Stay informed about AI news',
  protect_family: 'Protect myself & family from AI scams',
  cultural_impact: 'Understand AI\'s impact on society',
  hype_vs_real: 'Distinguish AI hype from reality',
  discuss_at_work: 'Discuss AI confidently at work',
  evaluate_tools: 'Evaluate AI tools for my team',
  industry_impact: 'Understand AI impact on my industry',
  build_with_ai: 'Build products using AI',
  career_transition: 'Transition my career into AI',
};

/**
 * Time commitment options with descriptions
 */
export const TIME_COMMITMENT_OPTIONS: Record<TimeCommitment, { label: string; minutes: string }> = {
  quick: { label: 'Quick Sessions', minutes: '5-10 min' },
  standard: { label: 'Standard Sessions', minutes: '15-30 min' },
  deep: { label: 'Deep Dives', minutes: '30-60 min' },
};

/**
 * Explanation level options with descriptions
 */
export const EXPLANATION_LEVEL_OPTIONS: Record<ExplanationLevel, { label: string; description: string }> = {
  simple: {
    label: 'Simple',
    description: 'No jargon, everyday analogies, accessible to everyone',
  },
  business: {
    label: 'Business',
    description: 'Business context, implications, and practical applications',
  },
  technical: {
    label: 'Technical',
    description: 'Architecture details, technical depth, implementation focus',
  },
};

/**
 * Audience type options with descriptions for onboarding
 */
export const AUDIENCE_TYPE_OPTIONS: Record<AudienceType, {
  label: string;
  icon: string;
  description: string;
  defaultContentLayer: 'plain-english' | 'executive' | 'technical' | 'simple';
}> = {
  everyday: {
    label: 'Everyday',
    icon: '🏠',
    description: 'I want to understand what AI is and how it affects my daily life',
    defaultContentLayer: 'plain-english',
  },
  leader: {
    label: 'Business',
    icon: '📊',
    description: 'I need to make AI decisions for my team or organization',
    defaultContentLayer: 'executive',
  },
  technical: {
    label: 'Technical',
    icon: '💻',
    description: 'I want deep technical understanding of how AI actually works',
    defaultContentLayer: 'technical',
  },
  general: {
    label: 'Explorer',
    icon: '🔍',
    description: 'I want to explore all perspectives and decide as I go',
    defaultContentLayer: 'simple',
  },
};

/**
 * All user roles as a readonly array
 */
export const USER_ROLES = [
  'everyday_user',
  'culture_enthusiast',
  'executive',
  'product_manager',
  'marketing_sales',
  'operations_hr',
  'developer',
  'student',
  'curious',
] as const;

/**
 * All learning goals as a readonly array
 */
export const LEARNING_GOALS = [
  'stay_informed',
  'protect_family',
  'cultural_impact',
  'hype_vs_real',
  'discuss_at_work',
  'evaluate_tools',
  'industry_impact',
  'build_with_ai',
  'career_transition',
] as const;

/**
 * All time commitments as a readonly array
 */
export const TIME_COMMITMENTS = ['quick', 'standard', 'deep'] as const;

/**
 * All explanation levels as a readonly array
 */
export const EXPLANATION_LEVELS = ['simple', 'business', 'technical'] as const;

/**
 * All audience types as a readonly array
 */
export const AUDIENCE_TYPES = ['everyday', 'leader', 'technical', 'general'] as const;
