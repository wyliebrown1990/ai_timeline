/**
 * User Management Admin Page
 * Sprint Spam-2 - Account Trust & Verification
 *
 * Admin page for viewing and managing user trust scores and permissions.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  RefreshCw,
  Loader2,
  Shield,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Mail,
  BookOpen,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

// =============================================================================
// Types
// =============================================================================

type TrustTier = 'new' | 'member' | 'trusted' | 'veteran';

interface UserListItem {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  trustScore: number;
  tier: TrustTier;
  createdAt: string;
  emailVerifiedAt: string | null;
  commentKarma: number;
  canComment: boolean;
}

interface UserDetail {
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string;
    emailVerifiedAt: string | null;
    canComment: boolean;
    commentUnlockedAt: string | null;
    commentKarma: number;
    trustScore: number;
    totalUpvotesReceived: number;
    totalDownvotesReceived: number;
    commentsRemovedCount: number;
    learningActionsCount: number;
    lastCommentAt: string | null;
    hourlyCommentCount: number;
    dailyCommentCount: number;
    totalComments: number;
  };
  trust: {
    score: number;
    tier: TrustTier;
    breakdown: {
      accountAge: number;
      upvotes: number;
      learningActions: number;
      emailVerified: number;
      downvotes: number;
      removedComments: number;
    };
  };
  limits: {
    commentsPerHour: number;
    commentsPerDay: number;
    votesPerHour: number;
    cooldownSeconds: number;
  };
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';
const AUTH_TOKEN_KEY = 'ai-timeline-admin-token';

async function getUsers(params: {
  sortBy?: string;
  sortOrder?: string;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: UserListItem[]; total: number }> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const searchParams = new URLSearchParams();
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.tier) searchParams.set('tier', params.tier);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/admin/users?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

async function getUserDetail(id: string): Promise<UserDetail> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE}/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user details');
  return response.json();
}

async function grantCommentPermission(id: string): Promise<void> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE}/admin/users/${id}/grant-comment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to grant permission');
}

async function revokeCommentPermission(id: string): Promise<void> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE}/admin/users/${id}/revoke-comment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to revoke permission');
}

async function resetTrustScore(id: string): Promise<void> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE}/admin/users/${id}/reset-trust`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to reset trust score');
}

// =============================================================================
// Helper Components
// =============================================================================

const TIER_CONFIG: Record<TrustTier, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  member: { label: 'Member', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  trusted: { label: 'Trusted', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  veteran: { label: 'Veteran', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
};

function TierBadge({ tier }: { tier: TrustTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color, config.bgColor)}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// =============================================================================
// Main Component
// =============================================================================

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TrustTier | 'all'>('all');
  const [sortBy, setSortBy] = useState<'trustScore' | 'createdAt' | 'commentKarma'>('trustScore');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadUsers = useCallback(async (showRefreshToast = false) => {
    try {
      setIsRefreshing(true);
      const data = await getUsers({
        sortBy,
        sortOrder: 'desc',
        tier: selectedTier === 'all' ? undefined : selectedTier,
        limit: 50,
      });
      setUsers(data.users);
      setTotal(data.total);
      if (showRefreshToast) {
        toast.success('Users refreshed');
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTier, sortBy]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUserClick = async (user: UserListItem) => {
    try {
      setIsLoadingDetail(true);
      const detail = await getUserDetail(user.id);
      setSelectedUser(detail);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleGrantComment = async () => {
    if (!selectedUser) return;
    try {
      await grantCommentPermission(selectedUser.user.id);
      toast.success('Commenting permission granted');
      // Refresh user detail
      const detail = await getUserDetail(selectedUser.user.id);
      setSelectedUser(detail);
      // Refresh list
      loadUsers();
    } catch {
      toast.error('Failed to grant permission');
    }
  };

  const handleRevokeComment = async () => {
    if (!selectedUser) return;
    if (!confirm('Revoke commenting permission for this user?')) return;
    try {
      await revokeCommentPermission(selectedUser.user.id);
      toast.success('Commenting permission revoked');
      const detail = await getUserDetail(selectedUser.user.id);
      setSelectedUser(detail);
      loadUsers();
    } catch {
      toast.error('Failed to revoke permission');
    }
  };

  const handleResetTrust = async () => {
    if (!selectedUser) return;
    if (!confirm('Reset trust score to 0? This cannot be undone.')) return;
    try {
      await resetTrustScore(selectedUser.user.id);
      toast.success('Trust score reset');
      const detail = await getUserDetail(selectedUser.user.id);
      setSelectedUser(detail);
      loadUsers();
    } catch {
      toast.error('Failed to reset trust score');
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-sm text-gray-500">View and manage user trust scores</p>
          </div>
        </div>
        <button
          onClick={() => loadUsers(true)}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
        </div>
        {(['new', 'member', 'trusted', 'veteran'] as TrustTier[]).map((tier) => (
          <div
            key={tier}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <TierBadge tier={tier} />
            </div>
            <div className={cn('text-2xl font-bold', TIER_CONFIG[tier].color)}>
              {users.filter((u) => u.tier === tier).length}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as TrustTier | 'all')}
            className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All Tiers</option>
            <option value="new">New</option>
            <option value="member">Member</option>
            <option value="trusted">Trusted</option>
            <option value="veteran">Veteran</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="trustScore">Trust Score</option>
            <option value="createdAt">Join Date</option>
            <option value="commentKarma">Comment Karma</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Trust Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Karma</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Verified</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Can Comment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.displayName || user.username}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={user.tier} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.round(user.trustScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('font-medium', user.commentKarma >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {user.commentKarma >= 0 ? '+' : ''}{user.commentKarma}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.emailVerifiedAt ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.canComment ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatRelativeDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Detail Modal */}
      {(selectedUser || isLoadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : selectedUser && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.user.displayName || selectedUser.user.username}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">@{selectedUser.user.username}</span>
                      <TierBadge tier={selectedUser.trust.tier} />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Trust Score Breakdown */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Trust Score Breakdown
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {Math.round(selectedUser.trust.score)}
                        <span className="text-sm font-normal text-gray-500 ml-2">points</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" /> Account Age
                          </span>
                          <span className={selectedUser.trust.breakdown.accountAge >= 0 ? 'text-green-600' : 'text-red-600'}>
                            +{Math.round(selectedUser.trust.breakdown.accountAge)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <ThumbsUp className="w-4 h-4" /> Upvotes Received
                          </span>
                          <span className="text-green-600">+{Math.round(selectedUser.trust.breakdown.upvotes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <BookOpen className="w-4 h-4" /> Learning Actions
                          </span>
                          <span className="text-green-600">+{Math.round(selectedUser.trust.breakdown.learningActions)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" /> Email Verified
                          </span>
                          <span className="text-green-600">+{selectedUser.trust.breakdown.emailVerified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <ThumbsDown className="w-4 h-4" /> Downvotes Received
                          </span>
                          <span className="text-red-600">{Math.round(selectedUser.trust.breakdown.downvotes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <XCircle className="w-4 h-4" /> Comments Removed
                          </span>
                          <span className="text-red-600">{Math.round(selectedUser.trust.breakdown.removedComments)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rate Limits */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Rate Limits (based on tier)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Comments/Hour</div>
                        <div className="text-lg font-medium">{selectedUser.limits.commentsPerHour}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Comments/Day</div>
                        <div className="text-lg font-medium">{selectedUser.limits.commentsPerDay}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Votes/Hour</div>
                        <div className="text-lg font-medium">{selectedUser.limits.votesPerHour}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Cooldown</div>
                        <div className="text-lg font-medium">{selectedUser.limits.cooldownSeconds}s</div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Activity Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Total Comments</div>
                        <div className="text-lg font-medium">{selectedUser.user.totalComments}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Comment Karma</div>
                        <div className={cn('text-lg font-medium', selectedUser.user.commentKarma >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {selectedUser.user.commentKarma >= 0 ? '+' : ''}{selectedUser.user.commentKarma}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-gray-500">Learning Actions</div>
                        <div className="text-lg font-medium">{selectedUser.user.learningActionsCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Email Verified</span>
                        <span className="flex items-center gap-1">
                          {selectedUser.user.emailVerifiedAt ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">{formatDate(selectedUser.user.emailVerifiedAt)}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Not verified</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Can Comment</span>
                        <span className="flex items-center gap-1">
                          {selectedUser.user.canComment ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">Yes</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">No</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Joined</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(selectedUser.user.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Last Comment</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(selectedUser.user.lastCommentAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Admin Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.user.canComment ? (
                        <button
                          onClick={handleRevokeComment}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          <XCircle className="w-4 h-4" />
                          Revoke Comment Permission
                        </button>
                      ) : (
                        <button
                          onClick={handleGrantComment}
                          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Grant Comment Permission
                        </button>
                      )}
                      <button
                        onClick={handleResetTrust}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Trust Score
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
