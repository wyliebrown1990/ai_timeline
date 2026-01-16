/**
 * FeedActionBar Component (Sprint Feed-3)
 *
 * Bottom action bar with voting, comment, save, AI chat, and share buttons.
 * Fixed to bottom of card with glass background for legibility.
 */

import { memo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  MessageCircle,
  Bookmark,
  Bot,
  Share2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeedActionBarProps {
  eventId: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  userVote: 'up' | 'down' | null;
  isSaved: boolean;
  onVote: (vote: 'up' | 'down') => void;
  onComment: () => void;
  onSave: () => void;
  onAIChat: () => void;
  onShare: () => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label?: string | number;
  onClick: () => void;
  isActive?: boolean;
  activeColor?: string;
  ariaLabel: string;
}

function ActionButton({
  icon,
  label,
  onClick,
  isActive = false,
  activeColor = 'text-white',
  ariaLabel,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg',
        'hover:bg-white/10 active:bg-white/20 transition-all duration-150',
        'min-w-[48px] min-h-[48px]',
        isActive ? activeColor : 'text-gray-400'
      )}
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      {icon}
      {label !== undefined && (
        <span className="text-xs font-medium tabular-nums">{label}</span>
      )}
    </button>
  );
}

function FeedActionBarComponent({
  upvotes,
  downvotes,
  commentCount,
  userVote,
  isSaved,
  onVote,
  onComment,
  onSave,
  onAIChat,
  onShare,
}: FeedActionBarProps) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between px-2',
        'bg-gray-950/80 backdrop-blur-md',
        'border-t border-white/5',
        'pb-[max(16px,env(safe-area-inset-bottom))]',
        'pt-2'
      )}
    >
      {/* Frequent actions - left side (thumb zone for right-handed users) */}
      <div className="flex items-center gap-1">
        {/* Upvote */}
        <ActionButton
          icon={
            <ChevronUp
              className={cn(
                'w-6 h-6 transition-transform',
                userVote === 'up' && 'scale-110'
              )}
              strokeWidth={userVote === 'up' ? 3 : 2}
            />
          }
          label={upvotes}
          onClick={() => onVote('up')}
          isActive={userVote === 'up'}
          activeColor="text-emerald-500"
          ariaLabel={`Upvote (${upvotes} votes)`}
        />

        {/* Downvote */}
        <ActionButton
          icon={
            <ChevronDown
              className={cn(
                'w-6 h-6 transition-transform',
                userVote === 'down' && 'scale-110'
              )}
              strokeWidth={userVote === 'down' ? 3 : 2}
            />
          }
          label={downvotes}
          onClick={() => onVote('down')}
          isActive={userVote === 'down'}
          activeColor="text-red-500"
          ariaLabel={`Downvote (${downvotes} votes)`}
        />

        {/* Comment */}
        <ActionButton
          icon={<MessageCircle className="w-5 h-5" />}
          label={commentCount > 0 ? commentCount : undefined}
          onClick={onComment}
          ariaLabel={`Comments (${commentCount})`}
        />
      </div>

      {/* Less frequent actions - right side */}
      <div className="flex items-center gap-1">
        {/* Save/Bookmark */}
        <ActionButton
          icon={
            <Bookmark
              className="w-5 h-5"
              fill={isSaved ? 'currentColor' : 'none'}
            />
          }
          onClick={onSave}
          isActive={isSaved}
          activeColor="text-amber-500"
          ariaLabel={isSaved ? 'Remove from saved' : 'Save for later'}
        />

        {/* AI Chat */}
        <ActionButton
          icon={<Bot className="w-5 h-5" />}
          onClick={onAIChat}
          ariaLabel="Ask AI about this"
        />

        {/* Share */}
        <ActionButton
          icon={<Share2 className="w-5 h-5" />}
          onClick={onShare}
          ariaLabel="Share this article"
        />
      </div>
    </footer>
  );
}

export const FeedActionBar = memo(FeedActionBarComponent);

export default FeedActionBar;
