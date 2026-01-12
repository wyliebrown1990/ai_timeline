/**
 * Spam Filters Admin Page
 * Sprint Spam-1 - Rate Limiting & Basic Protections
 *
 * Admin page for managing spam filters (blocked domains, keywords, regex patterns).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Loader2,
  Globe,
  Type,
  Code,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

// =============================================================================
// Types
// =============================================================================

interface SpamFilter {
  id: string;
  filterType: 'blocked_domain' | 'blocked_keyword' | 'regex';
  pattern: string;
  action: 'block' | 'flag_review';
  isActive: boolean;
  hitCount: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getFilters(): Promise<{ filters: SpamFilter[]; total: number }> {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE}/api/admin/spam-filters`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch filters');
  return response.json();
}

async function createFilter(data: {
  filterType: string;
  pattern: string;
  action: string;
}): Promise<SpamFilter> {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE}/api/admin/spam-filters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create filter');
  }
  return response.json();
}

async function updateFilter(
  id: string,
  data: { isActive?: boolean }
): Promise<SpamFilter> {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE}/api/admin/spam-filters/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update filter');
  return response.json();
}

async function deleteFilter(id: string): Promise<void> {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE}/api/admin/spam-filters/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete filter');
}

// =============================================================================
// Components
// =============================================================================

const FILTER_TYPE_INFO = {
  blocked_domain: {
    icon: Globe,
    label: 'Blocked Domain',
    description: 'Block links to this domain',
    placeholder: 'example.com',
  },
  blocked_keyword: {
    icon: Type,
    label: 'Blocked Keyword',
    description: 'Block comments containing this keyword',
    placeholder: 'Enter keyword to block',
  },
  regex: {
    icon: Code,
    label: 'Regex Pattern',
    description: 'Block comments matching this regex',
    placeholder: '\\b(spam|scam)\\b',
  },
};

function FilterTypeIcon({ type }: { type: SpamFilter['filterType'] }) {
  const Icon = FILTER_TYPE_INFO[type].icon;
  return <Icon className="w-4 h-4" />;
}

// =============================================================================
// Main Component
// =============================================================================

export default function SpamFiltersPage() {
  const [filters, setFilters] = useState<SpamFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFilter, setNewFilter] = useState({
    filterType: 'blocked_domain' as SpamFilter['filterType'],
    pattern: '',
    action: 'block' as 'block' | 'flag_review',
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadFilters = useCallback(async (showRefreshToast = false) => {
    try {
      setIsRefreshing(true);
      const data = await getFilters();
      setFilters(data.filters);
      if (showRefreshToast) {
        toast.success('Filters refreshed');
      }
    } catch (error) {
      toast.error('Failed to load filters');
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const handleToggle = async (filter: SpamFilter) => {
    try {
      await updateFilter(filter.id, { isActive: !filter.isActive });
      setFilters((prev) =>
        prev.map((f) =>
          f.id === filter.id ? { ...f, isActive: !f.isActive } : f
        )
      );
      toast.success(filter.isActive ? 'Filter disabled' : 'Filter enabled');
    } catch (error) {
      toast.error('Failed to update filter');
    }
  };

  const handleDelete = async (filter: SpamFilter) => {
    if (!confirm(`Delete filter "${filter.pattern}"?`)) return;

    try {
      await deleteFilter(filter.id);
      setFilters((prev) => prev.filter((f) => f.id !== filter.id));
      toast.success('Filter deleted');
    } catch (error) {
      toast.error('Failed to delete filter');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilter.pattern.trim()) {
      toast.error('Pattern is required');
      return;
    }

    try {
      setIsCreating(true);
      const created = await createFilter({
        filterType: newFilter.filterType,
        pattern: newFilter.pattern.trim(),
        action: newFilter.action,
      });
      setFilters((prev) => [created, ...prev]);
      setNewFilter({
        filterType: 'blocked_domain',
        pattern: '',
        action: 'block',
      });
      setShowCreateForm(false);
      toast.success('Filter created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create filter');
    } finally {
      setIsCreating(false);
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
          <Shield className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Spam Filters
            </h1>
            <p className="text-sm text-gray-500">
              Manage blocked domains, keywords, and patterns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFilters(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Add Filter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Total Filters</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filters.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {filters.filter((f) => f.isActive).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Total Hits</div>
          <div className="text-2xl font-bold text-orange-600">
            {filters.reduce((sum, f) => sum + f.hitCount, 0)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Blocked Domains</div>
          <div className="text-2xl font-bold text-blue-600">
            {filters.filter((f) => f.filterType === 'blocked_domain').length}
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Filter
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Filter Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(FILTER_TYPE_INFO) as SpamFilter['filterType'][]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setNewFilter((prev) => ({ ...prev, filterType: type }))
                        }
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border',
                          newFilter.filterType === type
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <FilterTypeIcon type={type} />
                        <span className="text-xs">
                          {FILTER_TYPE_INFO[type].label.split(' ')[0]}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Pattern */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pattern
                </label>
                <input
                  type="text"
                  value={newFilter.pattern}
                  onChange={(e) =>
                    setNewFilter((prev) => ({ ...prev, pattern: e.target.value }))
                  }
                  placeholder={FILTER_TYPE_INFO[newFilter.filterType].placeholder}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {FILTER_TYPE_INFO[newFilter.filterType].description}
                </p>
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewFilter((prev) => ({ ...prev, action: 'block' }))
                    }
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border',
                      newFilter.action === 'block'
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewFilter((prev) => ({ ...prev, action: 'flag_review' }))
                    }
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border',
                      newFilter.action === 'flag_review'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Flag for Review
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newFilter.pattern.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No spam filters configured</p>
            <p className="text-sm">Click "Add Filter" to create one</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Pattern
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Hits
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filters.map((filter) => (
                <tr
                  key={filter.id}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    !filter.isActive && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FilterTypeIcon type={filter.filterType} />
                      <span>{FILTER_TYPE_INFO[filter.filterType].label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {filter.pattern}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded',
                        filter.action === 'block'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      )}
                    >
                      {filter.action === 'block' ? 'Block' : 'Flag'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {filter.hitCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(filter)}
                      className="flex items-center gap-1"
                    >
                      {filter.isActive ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(filter)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete filter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
