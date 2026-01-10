import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  ExternalLink,
  GitMerge,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  keyFiguresApi,
  type KeyFigure,
  type KeyFigureRole,
  type KeyFigureStatus,
} from '../../services/api';

// Role labels and colors
const ROLE_LABELS: Record<KeyFigureRole, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy Maker',
  engineer: 'Engineer',
  other: 'Other',
};

const ROLE_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-100 text-blue-800',
  executive: 'bg-purple-100 text-purple-800',
  founder: 'bg-green-100 text-green-800',
  policy_maker: 'bg-amber-100 text-amber-800',
  engineer: 'bg-cyan-100 text-cyan-800',
  other: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<KeyFigureStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-orange-100 text-orange-800',
  published: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<KeyFigureStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
};

/**
 * Admin page for managing key figures
 */
export function KeyFiguresPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyFigures, setKeyFigures] = useState<KeyFigure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection state for merge functionality
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Parse query params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const roleFilter = (searchParams.get('role') as KeyFigureRole) || undefined;
  const statusFilter = (searchParams.get('status') as KeyFigureStatus) || undefined;

  const [searchInput, setSearchInput] = useState(search);

  const loadKeyFigures = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await keyFiguresApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter,
        status: statusFilter,
      });
      setKeyFigures(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      toast.error('Failed to load key figures');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadKeyFigures();
  }, [loadKeyFigures]);

  // Update URL params
  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    // Reset to page 1 when filters change
    if (!updates.page) {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput || undefined, page: undefined });
  };

  const handleDelete = async (figure: KeyFigure) => {
    if (!confirm(`Delete "${figure.canonicalName}"? This cannot be undone.`)) return;

    try {
      await keyFiguresApi.delete(figure.id);
      toast.success(`Deleted ${figure.canonicalName}`);
      loadKeyFigures();
    } catch (error) {
      toast.error('Failed to delete key figure');
      console.error(error);
    }
  };

  // Selection handlers for merge functionality
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === keyFigures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(keyFigures.map((f) => f.id)));
    }
  };

  const handleMergeSelected = () => {
    if (selectedIds.size < 2) {
      toast.error('Select at least 2 figures to merge');
      return;
    }
    // Navigate to merge page with selected IDs
    navigate(`/admin/key-figures/merge?ids=${Array.from(selectedIds).join(',')}`);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key Figures</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} total figures in AI history
            {selectedIds.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({selectedIds.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Merge button - shown when 2+ items selected */}
          {selectedIds.size >= 2 && (
            <button
              onClick={handleMergeSelected}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              Merge Selected ({selectedIds.size})
            </button>
          )}
          {/* Clear selection button */}
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
          <Link
            to="/admin/key-figures/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Key Figure
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, alias, or organization..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </form>

          {/* Role Filter */}
          <select
            value={roleFilter || ''}
            onChange={(e) =>
              updateParams({ role: e.target.value || undefined, page: undefined })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter || ''}
            onChange={(e) =>
              updateParams({ status: e.target.value || undefined, page: undefined })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(search || roleFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchParams(new URLSearchParams());
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="animate-pulse p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : keyFigures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No key figures found</h3>
          <p className="text-gray-500 mb-4">
            {search || roleFilter || statusFilter
              ? 'Try adjusting your filters.'
              : 'Add the first key figure to get started.'}
          </p>
          {!search && !roleFilter && !statusFilter && (
            <Link
              to="/admin/key-figures/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Add Key Figure
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox column for merge selection */}
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === keyFigures.length && keyFigures.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title={selectedIds.size === keyFigures.length ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keyFigures.map((figure) => (
                <tr
                  key={figure.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedIds.has(figure.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => navigate(`/admin/key-figures/${figure.id}/edit`)}
                >
                  {/* Checkbox cell */}
                  <td
                    className="w-12 px-4 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(figure.id)}
                      onChange={() => toggleSelection(figure.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {figure.imageUrl ? (
                        <img
                          src={figure.imageUrl}
                          alt={figure.canonicalName}
                          className="h-10 w-10 rounded-full object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm font-medium">
                            {figure.canonicalName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {figure.canonicalName}
                        </div>
                        {figure.aliases.length > 0 && (
                          <div className="text-xs text-gray-500">
                            aka {figure.aliases.slice(0, 2).join(', ')}
                            {figure.aliases.length > 2 && ` +${figure.aliases.length - 2}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {figure.primaryOrg || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ROLE_COLORS[figure.role]
                      }`}
                    >
                      {ROLE_LABELS[figure.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[figure.status]
                      }`}
                    >
                      {STATUS_LABELS[figure.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {figure.wikipediaUrl && (
                        <a
                          href={figure.wikipediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Wikipedia"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/admin/key-figures/${figure.id}/edit`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(figure)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => updateParams({ page: String(page - 1) })}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => updateParams({ page: String(page + 1) })}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KeyFiguresPage;
