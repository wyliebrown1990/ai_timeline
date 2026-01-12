/**
 * News Quiz Generator Service (Sprint LEarn-2)
 *
 * Generates weekly AI news quizzes using Claude to test understanding
 * of recent news events and their connection to AI concepts.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PrismaClient } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface NewsQuizQuestion {
  newsEventId: string;
  newsHeadline: string;
  questionType: 'fact_recall' | 'concept_application' | 'timeline' | 'impact';
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation: string;
  relatedConceptId?: string;
  relatedConceptName?: string;
}

export interface GeneratedQuiz {
  weekOf: Date;
  questions: NewsQuizQuestion[];
}

interface NewsEventWithContext {
  id: string;
  headline: string;
  summary: string;
  publishedDate: Date;
  whyItMatters: string | null;
  concepts: Array<{
    id: string;
    term: string;
    isKeyTopic: boolean;
  }>;
  relatedMilestones: Array<{
    id: string;
    title: string;
  }>;
}

// =============================================================================
// Quiz Generation
// =============================================================================

/**
 * Get the start of the current week (Monday 00:00 UTC)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setUTCDate(diff);
  return d;
}

/**
 * Get recent news events with their learning context
 */
async function getRecentNewsWithContext(
  prisma: PrismaClient,
  daysBack: number = 7
): Promise<NewsEventWithContext[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      publishedDate: { gte: cutoffDate },
    },
    orderBy: { publishedDate: 'desc' },
    take: 20, // Max 20 events to consider
    include: {
      conceptLinks: {
        include: {
          concept: {
            select: { id: true, term: true },
          },
        },
      },
    },
  });

  return events.map((event) => ({
    id: event.id,
    headline: event.headline,
    summary: event.summary,
    publishedDate: event.publishedDate,
    whyItMatters: event.whyItMatters,
    concepts: event.conceptLinks.map((link) => ({
      id: link.concept.id,
      term: link.concept.term,
      isKeyTopic: link.isKeyTopic,
    })),
    relatedMilestones: JSON.parse(event.relatedMilestoneIds || '[]').map(
      (id: string) => ({ id, title: '' }) // We don't need titles for quiz generation
    ),
  }));
}

/**
 * Generate quiz questions using Claude
 */
async function generateQuizQuestions(
  events: NewsEventWithContext[],
  targetCount: number = 5
): Promise<NewsQuizQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  if (events.length === 0) {
    console.log('[QuizGenerator] No events available for quiz generation');
    return [];
  }

  const anthropic = new Anthropic({ apiKey });

  // Prepare event summaries for the prompt
  const eventSummaries = events.map((e, i) => ({
    index: i,
    id: e.id,
    headline: e.headline,
    summary: e.summary,
    concepts: e.concepts.map((c) => c.term).join(', '),
    whyItMatters: e.whyItMatters || 'Not available',
  }));

  const prompt = `You are generating a quiz about recent AI news to help users understand current developments in AI.

Here are the recent news events to create questions from:

${JSON.stringify(eventSummaries, null, 2)}

Generate exactly ${targetCount} multiple-choice quiz questions. Each question should:
1. Test understanding of the news event, not just recall
2. Have exactly 4 options (A, B, C, D)
3. Have one clearly correct answer
4. Include a brief explanation of why the correct answer is right

Mix different question types:
- fact_recall: "Which company announced X?"
- concept_application: "This technique is an example of which AI approach?"
- timeline: "This builds on which previous development?"
- impact: "Why is this announcement significant?"

Respond with ONLY a JSON array of questions in this exact format:
[
  {
    "eventIndex": 0,
    "questionType": "fact_recall",
    "question": "Which company announced the new AI model discussed in the news?",
    "options": ["OpenAI", "Google", "Meta", "Anthropic"],
    "correctAnswer": 0,
    "explanation": "OpenAI announced this model as stated in the headline.",
    "relatedConcept": "transformer"
  }
]

Important:
- eventIndex must match the index from the events list above
- correctAnswer is 0-3 (index of the correct option)
- relatedConcept is optional - include if the question relates to a specific AI concept
- Make questions engaging and educational, not trivia`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz questions JSON from response');
    }

    const rawQuestions = JSON.parse(jsonMatch[0]);

    // Map to our format with event details
    const questions: NewsQuizQuestion[] = rawQuestions.map(
      (q: {
        eventIndex: number;
        questionType: string;
        question: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
        relatedConcept?: string;
      }) => {
        const event = events[q.eventIndex];
        const relatedConcept = q.relatedConcept
          ? event?.concepts.find(
              (c) => c.term.toLowerCase() === q.relatedConcept?.toLowerCase()
            )
          : undefined;

        return {
          newsEventId: event?.id || '',
          newsHeadline: event?.headline || '',
          questionType: q.questionType as NewsQuizQuestion['questionType'],
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          relatedConceptId: relatedConcept?.id,
          relatedConceptName: relatedConcept?.term,
        };
      }
    );

    console.log(`[QuizGenerator] Generated ${questions.length} questions`);
    return questions;
  } catch (error) {
    console.error('[QuizGenerator] Failed to generate questions:', error);
    throw error;
  }
}

/**
 * Generate a weekly news quiz
 */
export async function generateWeeklyQuiz(
  prisma: PrismaClient,
  options: {
    questionCount?: number;
    daysBack?: number;
    forceRegenerate?: boolean;
  } = {}
): Promise<GeneratedQuiz> {
  const { questionCount = 5, daysBack = 7, forceRegenerate = false } = options;

  const weekOf = getWeekStart();

  // Check if quiz already exists for this week
  const existingQuiz = await prisma.newsQuiz.findUnique({
    where: { weekOf },
  });

  if (existingQuiz && !forceRegenerate) {
    console.log(`[QuizGenerator] Quiz already exists for week of ${weekOf.toISOString()}`);
    return {
      weekOf,
      questions: existingQuiz.questions as NewsQuizQuestion[],
    };
  }

  console.log(`[QuizGenerator] Generating quiz for week of ${weekOf.toISOString()}`);

  // Get recent news events
  const events = await getRecentNewsWithContext(prisma, daysBack);

  if (events.length < 3) {
    throw new Error(`Not enough news events (${events.length}) to generate quiz. Need at least 3.`);
  }

  // Generate questions
  const questions = await generateQuizQuestions(events, questionCount);

  if (questions.length === 0) {
    throw new Error('Failed to generate any quiz questions');
  }

  // Save or update the quiz
  if (existingQuiz) {
    await prisma.newsQuiz.update({
      where: { id: existingQuiz.id },
      data: { questions: questions as unknown as object[] },
    });
    console.log(`[QuizGenerator] Updated existing quiz ${existingQuiz.id}`);
  } else {
    const newQuiz = await prisma.newsQuiz.create({
      data: {
        weekOf,
        questions: questions as unknown as object[],
      },
    });
    console.log(`[QuizGenerator] Created new quiz ${newQuiz.id}`);
  }

  return { weekOf, questions };
}

/**
 * Get the current week's quiz
 */
export async function getCurrentQuiz(prisma: PrismaClient): Promise<{
  quiz: { id: string; weekOf: Date; questions: NewsQuizQuestion[] } | null;
  weekStart: Date;
  weekEnd: Date;
}> {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const quiz = await prisma.newsQuiz.findUnique({
    where: { weekOf: weekStart },
  });

  return {
    quiz: quiz
      ? {
          id: quiz.id,
          weekOf: quiz.weekOf,
          questions: quiz.questions as NewsQuizQuestion[],
        }
      : null,
    weekStart,
    weekEnd,
  };
}

/**
 * Get quiz history (past quizzes)
 */
export async function getQuizHistory(
  prisma: PrismaClient,
  limit: number = 10
): Promise<Array<{ id: string; weekOf: Date; questionCount: number; createdAt: Date }>> {
  const quizzes = await prisma.newsQuiz.findMany({
    orderBy: { weekOf: 'desc' },
    take: limit,
    select: {
      id: true,
      weekOf: true,
      questions: true,
      createdAt: true,
    },
  });

  return quizzes.map((q) => ({
    id: q.id,
    weekOf: q.weekOf,
    questionCount: (q.questions as unknown[]).length,
    createdAt: q.createdAt,
  }));
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuizAttempt(
  prisma: PrismaClient,
  sessionId: string,
  quizId: string,
  answers: Array<{ questionIndex: number; selectedAnswer: number }>
): Promise<{
  score: number;
  totalQuestions: number;
  percentage: number;
  results: Array<{
    questionIndex: number;
    correct: boolean;
    correctAnswer: number;
    explanation: string;
  }>;
}> {
  // Get the quiz
  const quiz = await prisma.newsQuiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw new Error(`Quiz not found: ${quizId}`);
  }

  const questions = quiz.questions as NewsQuizQuestion[];

  // Calculate results
  const results = answers.map((answer) => {
    const question = questions[answer.questionIndex];
    const correct = question?.correctAnswer === answer.selectedAnswer;
    return {
      questionIndex: answer.questionIndex,
      correct,
      correctAnswer: question?.correctAnswer ?? -1,
      explanation: question?.explanation ?? '',
    };
  });

  const score = results.filter((r) => r.correct).length;
  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Save the attempt
  await prisma.newsQuizAttempt.create({
    data: {
      sessionId,
      quizId,
      score,
      totalQuestions,
      answers: answers.map((a, i) => ({
        ...a,
        correct: results[i].correct,
      })),
    },
  });

  console.log(`[QuizGenerator] Quiz attempt saved: ${score}/${totalQuestions} (${percentage}%)`);

  return {
    score,
    totalQuestions,
    percentage,
    results,
  };
}

/**
 * Get user's quiz history
 */
export async function getUserQuizHistory(
  prisma: PrismaClient,
  sessionId: string,
  limit: number = 10
): Promise<
  Array<{
    quizId: string;
    weekOf: Date;
    score: number;
    totalQuestions: number;
    percentage: number;
    completedAt: Date;
  }>
> {
  const attempts = await prisma.newsQuizAttempt.findMany({
    where: { sessionId },
    orderBy: { completedAt: 'desc' },
    take: limit,
    include: {
      quiz: {
        select: { weekOf: true },
      },
    },
  });

  return attempts.map((a) => ({
    quizId: a.quizId,
    weekOf: a.quiz.weekOf,
    score: a.score,
    totalQuestions: a.totalQuestions,
    percentage: Math.round((a.score / a.totalQuestions) * 100),
    completedAt: a.completedAt,
  }));
}
