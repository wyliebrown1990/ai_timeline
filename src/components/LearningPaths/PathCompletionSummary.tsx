import { useEffect, useState, useCallback } from 'react';
import { Trophy, Clock, BookOpen, Share2, ArrowRight, RotateCcw, Check, Copy } from 'lucide-react';
import type { LearningPath } from '../../types/learningPath';
import { useLearningPath } from '../../hooks/useContent';

interface PathCompletionSummaryProps {
  /** The completed learning path */
  path: LearningPath;
  /** Time spent on the path in seconds */
  timeSpentSeconds: number;
  /** Callback to start a suggested next path */
  onStartNextPath?: (pathId: string) => void;
  /** Callback to reset and restart this path */
  onRestartPath?: () => void;
  /** Callback to return to path selection */
  onBackToPathSelection?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Confetti particle configuration
 */
interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

/**
 * Generate confetti particles
 */
function generateConfetti(count: number): ConfettiParticle[] {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)] as string,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }));
}

/**
 * Format seconds into a readable duration
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Path Completion Summary Component
 *
 * Displays when a user completes a learning path:
 * - Confetti celebration animation
 * - Key takeaways from the path
 * - Time spent and milestones completed
 * - Suggested next paths
 * - Share/copy completion link
 */
export function PathCompletionSummary({
  path,
  timeSpentSeconds,
  onStartNextPath,
  onRestartPath,
  onBackToPathSelection,
  className = '',
}: PathCompletionSummaryProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate confetti on mount
  useEffect(() => {
    setConfetti(generateConfetti(50));

    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Handle share/copy
  const handleShare = useCallback(async () => {
    const shareText = `I just completed "${path.title}" on AI Timeline! 🎉`;
    const shareUrl = `${window.location.origin}/learn/${path.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Completed: ${path.title}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  }, [path]);

  // Get first suggested next path
  const { data: suggestedPath } = useLearningPath(path.suggestedNextPathIds[0] || '');

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ${className}`}
      data-testid="path-completion-summary"
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-sm animate-confetti"
              style={{
                left: `${particle.x}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent)]" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
          <p className="text-green-100">
            You completed <span className="font-semibold">{path.title}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Milestones</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {path.milestoneIds.length}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Time Spent</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatDuration(timeSpentSeconds)}
          </p>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Key Takeaways
        </h3>
        <ul className="space-y-2">
          {path.keyTakeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {takeaway}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Concepts Covered */}
      {path.conceptsCovered.length > 0 && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Concepts You Now Understand
          </h3>
          <div className="flex flex-wrap gap-2">
            {path.conceptsCovered.map((concept) => (
              <span
                key={concept}
                className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next Path */}
      {suggestedPath && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Continue Your Learning
          </h3>
          <button
            onClick={() => onStartNextPath?.(suggestedPath.id)}
            className="w-full flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{suggestedPath.icon || '📚'}</span>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {suggestedPath.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {suggestedPath.milestoneIds.length} milestones · ~{suggestedPath.estimatedMinutes} min
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Copied!
            </>
          ) : (
            <>
              {typeof navigator !== 'undefined' && 'share' in navigator ? (
                <Share2 className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              Share Your Achievement
            </>
          )}
        </button>

        <div className="flex gap-3">
          {onRestartPath && (
            <button
              onClick={onRestartPath}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
          )}
          {onBackToPathSelection && (
            <button
              onClick={onBackToPathSelection}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              All Paths
            </button>
          )}
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export default PathCompletionSummary;
