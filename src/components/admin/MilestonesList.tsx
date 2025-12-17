import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MilestoneResponse } from '../../types/milestone';
import { CategoryBadge } from '../Timeline/CategoryBadge';
import { SignificanceBadge } from '../Timeline/SignificanceBadge';
import type { SignificanceLevel } from '../../types/milestone';

type SortField = 'title' | 'date' | 'category' | 'significance';
type SortOrder = 'asc' | 'desc';

interface MilestonesListProps {
  /** Array of milestones to display */
  milestones: MilestoneResponse[];
  /** Handler for edit action */
  onEdit: (id: string) => void;
  /** Handler for delete action */
  onDelete: (id: string) => void;
  /** Items per page */
  pageSize?: number;
}

/**
 * Admin table component for displaying and managing milestones
 * Includes sorting and pagination
 */
export function MilestonesList({
  milestones,
  onEdit,
  onDelete,
  pageSize = 10,
}: MilestonesListProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Sort milestones
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'significance':
          comparison = a.significance - b.significance;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [milestones, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedMilestones.length / pageSize);
  const paginatedMilestones = sortedMilestones.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <div data-testid="admin-milestones-list" className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="milestones-table" className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('title')}
                    data-testid="sort-title"
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Title
                    <SortIndicator field="title" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('date')}
                    data-testid="sort-date"
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Date
                    <SortIndicator field="date" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Category
                    <SortIndicator field="category" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('significance')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Significance
                    <SortIndicator field="significance" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedMilestones.map((milestone) => (
                <tr
                  key={milestone.id}
                  data-testid="milestone-row"
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="font-medium text-gray-900 truncate">
                        {milestone.title}
                      </p>
                      {milestone.organization && (
                        <p className="text-sm text-gray-500 truncate">
                          {milestone.organization}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {new Date(milestone.date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <CategoryBadge category={milestone.category} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <SignificanceBadge
                      significance={milestone.significance as SignificanceLevel}
                      variant="badge"
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(milestone.id)}
                        data-testid="edit-btn"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit milestone"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(milestone.id)}
                        data-testid="delete-btn"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete milestone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedMilestones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No milestones found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          data-testid="pagination"
          className="flex items-center justify-between"
        >
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedMilestones.length)} of{' '}
            {sortedMilestones.length} milestones
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="page-prev"
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="page-next"
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestonesList;
