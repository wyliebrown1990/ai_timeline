/**
 * Public User Profile Page (Sprint LEarn-3)
 *
 * Displays a user's public profile information.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Calendar,
  ArrowLeft,
  MessageSquare,
  Clock,
  Building2,
  Users,
  BookOpen,
  Newspaper,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from 'lucide-react';
import { getPublicProfile, type PublicUserProfile } from '../services/userAuth';
import { getUserComments } from '../services/commentsApi';
import type { Comment, CommentTargetType } from '../types/comment';

// Helper to get icon for target type
function getTargetIcon(targetType: CommentTargetType) {
  switch (targetType) {
    case 'milestone':
      return <Clock className="w-4 h-4" />;
    case 'person':
      return <Users className="w-4 h-4" />;
    case 'organization':
      return <Building2 className="w-4 h-4" />;
    case 'glossary_term':
      return <BookOpen className="w-4 h-4" />;
    case 'news_event':
      return <Newspaper className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
}

// Helper to get label for target type
function getTargetLabel(targetType: CommentTargetType): string {
  switch (targetType) {
    case 'milestone':
      return 'milestone';
    case 'person':
      return 'person';
    case 'organization':
      return 'organization';
    case 'glossary_term':
      return 'glossary term';
    case 'news_event':
      return 'news event';
    default:
      return 'content';
  }
}

// Helper to get link for target
function getTargetLink(targetType: CommentTargetType, targetId: string): string {
  switch (targetType) {
    case 'milestone':
      return `/timeline?milestone=${targetId}`;
    case 'person':
      return `/people/${targetId}`;
    case 'organization':
      return `/organizations/${targetId}`;
    case 'glossary_term':
      return `/glossary?term=${targetId}`;
    case 'news_event':
      return `/news?event=${targetId}`;
    default:
      return '/';
  }
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [totalKarma, setTotalKarma] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getPublicProfile(username);
        if (data) {
          setProfile(data);
        } else {
          setError('User not found');
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('[UserProfile] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Fetch user's comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!username) return;

      setCommentsLoading(true);
      try {
        const data = await getUserComments(username, { limit: 20 });
        setComments(data.comments);
        // Calculate total karma from comment scores
        const karma = data.comments.reduce((sum, c) => sum + c.score, 0);
        setTotalKarma(karma);
      } catch (err) {
        console.error('[UserProfile] Error fetching comments:', err);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] dark:bg-zinc-900 flex items-center justify-center px-4">
        <div className="text-center">
          <User className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
            {error || 'User not found'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            The profile you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#E07A5F] hover:text-[#c96a52]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] dark:bg-zinc-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Profile card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Header with avatar */}
          <div className="bg-gradient-to-r from-[#E07A5F] to-[#c96a52] h-32" />
          <div className="px-6 pb-6">
            <div className="-mt-16 mb-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || profile.username}
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-800 object-cover bg-white dark:bg-zinc-700"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="w-16 h-16 text-zinc-400 dark:text-zinc-500" />
                </div>
              )}
            </div>

            {/* Name and username */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {profile.displayName || profile.username}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">@{profile.username}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-zinc-600 dark:text-zinc-300 mb-4 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {/* Join date */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Calendar className="w-4 h-4" />
              <span>
                Joined{' '}
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Comment History Section */}
        <div className="mt-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Comment History
                </h2>
              </div>
              {totalKarma !== 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Karma:</span>
                  <span
                    className={
                      totalKarma > 0
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : totalKarma < 0
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-zinc-600 dark:text-zinc-300'
                    }
                  >
                    {totalKarma > 0 ? '+' : ''}
                    {totalKarma}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {commentsLoading ? (
              <div className="px-6 py-8 text-center text-zinc-400 dark:text-zinc-500">
                <div className="animate-pulse">Loading comments...</div>
              </div>
            ) : comments.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-400 dark:text-zinc-500">
                No comments yet.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                  {/* Comment target link */}
                  <Link
                    to={getTargetLink(comment.targetType, comment.targetId)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-[#E07A5F] dark:hover:text-[#E07A5F] mb-2"
                  >
                    {getTargetIcon(comment.targetType)}
                    <span>Comment on {getTargetLabel(comment.targetType)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {/* Comment body */}
                  <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap line-clamp-3">
                    {comment.isDeleted ? (
                      <span className="italic text-zinc-400 dark:text-zinc-500">[deleted]</span>
                    ) : (
                      comment.body
                    )}
                  </p>

                  {/* Comment meta */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>
                      {new Date(comment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp className="w-3 h-3" />
                        {comment.upvotes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <ThumbsDown className="w-3 h-3" />
                        {comment.downvotes}
                      </span>
                      <span
                        className={
                          comment.score > 0
                            ? 'text-green-600 dark:text-green-400'
                            : comment.score < 0
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                        }
                      >
                        ({comment.score > 0 ? '+' : ''}
                        {comment.score})
                      </span>
                    </div>
                    {comment.editedAt && (
                      <span className="italic">edited</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
