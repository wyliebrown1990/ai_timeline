import { BarChart3, Clock, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminMilestones } from '../../hooks/useAdminMilestones';
import { MilestoneCategory } from '../../types/milestone';
import { categoryLabels } from '../../utils/timelineUtils';

/**
 * Admin dashboard with overview statistics and quick actions
 */
export function AdminDashboard() {
  const { milestones, isLoading } = useAdminMilestones();

  // Calculate statistics
  const stats = {
    total: milestones.length,
    byCategory: Object.values(MilestoneCategory).reduce(
      (acc, cat) => {
        acc[cat] = milestones.filter((m) => m.category === cat).length;
        return acc;
      },
      {} as Record<MilestoneCategory, number>
    ),
    recentCount: milestones.filter((m) => {
      const date = new Date(m.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    }).length,
  };

  // Get most recent milestones
  const recentMilestones = [...milestones]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your AI timeline milestones
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

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total milestones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Milestones</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats.total}
              </p>
            </div>
          </div>
        </div>

        {/* Recent additions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Added (30 days)</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats.recentCount}
              </p>
            </div>
          </div>
        </div>

        {/* Categories covered */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(MilestoneCategory).length}
              </p>
            </div>
          </div>
        </div>

        {/* Time span */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Time Span</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading || milestones.length === 0
                  ? '—'
                  : `${Math.min(...milestones.map((m) => new Date(m.date).getFullYear()))} - ${Math.max(...milestones.map((m) => new Date(m.date).getFullYear()))}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Milestones by Category
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).map(([category, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {categoryLabels[category as MilestoneCategory]}
                    </span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent milestones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recently Added
            </h2>
            <Link
              to="/admin/milestones"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recentMilestones.length > 0 ? (
            <ul className="space-y-3">
              {recentMilestones.map((milestone) => (
                <li key={milestone.id}>
                  <Link
                    to={`/admin/milestones/${milestone.id}/edit`}
                    className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-gray-900 truncate">
                      {milestone.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(milestone.date).toLocaleDateString()} •{' '}
                      {categoryLabels[milestone.category as MilestoneCategory]}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No milestones yet.{' '}
              <Link to="/admin/milestones/new" className="text-blue-600 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
