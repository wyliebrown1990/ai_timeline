/**
 * Public User Profile Page (Sprint LEarn-3)
 *
 * Displays a user's public profile information.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, ArrowLeft } from 'lucide-react';
import { getPublicProfile, type PublicUserProfile } from '../services/userAuth';

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
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

        {/* Future: Learning stats, badges, activity feed */}
        <div className="mt-8 text-center text-zinc-400 dark:text-zinc-500 text-sm">
          More profile features coming soon...
        </div>
      </div>
    </div>
  );
}
