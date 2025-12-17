import { Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MilestonesList } from '../../components/admin/MilestonesList';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAdminMilestones } from '../../hooks/useAdminMilestones';
import { MilestoneCategory } from '../../types/milestone';
import { categoryLabels } from '../../utils/timelineUtils';
import toast from 'react-hot-toast';

/**
 * Admin page for listing and managing all milestones
 */
export function MilestonesListPage() {
  const navigate = useNavigate();
  const { milestones, isLoading, deleteMilestone } = useAdminMilestones();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MilestoneCategory | ''>('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter milestones
  const filteredMilestones = milestones.filter((milestone) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        milestone.title.toLowerCase().includes(query) ||
        milestone.description.toLowerCase().includes(query) ||
        milestone.organization?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (categoryFilter && milestone.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  // Handle edit navigation
  const handleEdit = (id: string) => {
    navigate(`/admin/milestones/${id}/edit`);
  };

  // Handle delete request
  const handleDeleteRequest = (id: string) => {
    setDeleteTarget(id);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteMilestone(deleteTarget);
      toast.success('Milestone deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete milestone');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get milestone being deleted for dialog
  const milestoneToDelete = deleteTarget
    ? milestones.find((m) => m.id === deleteTarget)
    : null;

  return (
    <div data-testid="milestones-list-page" className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all AI timeline milestones
          </p>
        </div>
        <Link
          to="/admin/milestones/new"
          data-testid="create-milestone-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Milestone
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
              placeholder="Search milestones..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MilestoneCategory | '')}
            data-testid="category-filter"
            className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.values(MilestoneCategory).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Active filters summary */}
        {(searchQuery || categoryFilter) && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-gray-500">
              Showing {filteredMilestones.length} of {milestones.length} milestones
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Milestones list */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-500">Loading milestones...</p>
          </div>
        </div>
      ) : (
        <MilestonesList
          milestones={filteredMilestones}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Milestone"
        message={
          milestoneToDelete
            ? `Are you sure you want to delete "${milestoneToDelete.title}"? This action cannot be undone.`
            : 'Are you sure you want to delete this milestone?'
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        destructive
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default MilestonesListPage;
