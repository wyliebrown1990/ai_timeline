import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Bot,
  User,
  Filter,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  glossaryApi,
  type GlossaryTerm,
  type GlossaryCategory,
  type GlossaryStats,
  type CreateGlossaryTermDto,
  type UpdateGlossaryTermDto,
} from '../../services/api';

// Category labels for display
const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  core_concept: 'Core Concept',
  technical_term: 'Technical Term',
  business_term: 'Business Term',
  model_architecture: 'Model Architecture',
  company_product: 'Company/Product',
};

// Category colors for badges
const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  core_concept: 'bg-blue-100 text-blue-800',
  technical_term: 'bg-purple-100 text-purple-800',
  business_term: 'bg-green-100 text-green-800',
  model_architecture: 'bg-orange-100 text-orange-800',
  company_product: 'bg-pink-100 text-pink-800',
};

/**
 * Admin page for managing glossary terms
 */
export function GlossaryAdminPage() {
  // State
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [stats, setStats] = useState<GlossaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<GlossaryCategory | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateGlossaryTermDto>({
    term: '',
    shortDefinition: '',
    fullDefinition: '',
    businessContext: '',
    example: '',
    inMeetingExample: '',
    category: 'core_concept',
    relatedTermIds: [],
    relatedMilestoneIds: [],
  });

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await glossaryApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load terms
  const loadTerms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await glossaryApi.getAll({
        page,
        limit: 20,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      setTerms(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load terms:', error);
      toast.error('Failed to load glossary terms');
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, searchQuery]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchQuery]);

  // Open modal for creating new term
  const handleCreate = () => {
    setEditingTerm(null);
    setFormData({
      term: '',
      shortDefinition: '',
      fullDefinition: '',
      businessContext: '',
      example: '',
      inMeetingExample: '',
      category: 'core_concept',
      relatedTermIds: [],
      relatedMilestoneIds: [],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing term
  const handleEdit = (term: GlossaryTerm) => {
    setEditingTerm(term);
    setFormData({
      term: term.term,
      shortDefinition: term.shortDefinition,
      fullDefinition: term.fullDefinition,
      businessContext: term.businessContext || '',
      example: term.example || '',
      inMeetingExample: term.inMeetingExample || '',
      category: term.category,
      relatedTermIds: term.relatedTermIds,
      relatedMilestoneIds: term.relatedMilestoneIds,
    });
    setIsModalOpen(true);
  };

  // Save term (create or update)
  const handleSave = async () => {
    // Validation
    if (!formData.term.trim()) {
      toast.error('Term is required');
      return;
    }
    if (!formData.shortDefinition.trim()) {
      toast.error('Short definition is required');
      return;
    }
    if (!formData.fullDefinition.trim()) {
      toast.error('Full definition is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTerm) {
        // Update existing term
        const updateData: UpdateGlossaryTermDto = {
          term: formData.term,
          shortDefinition: formData.shortDefinition,
          fullDefinition: formData.fullDefinition,
          businessContext: formData.businessContext || null,
          example: formData.example || null,
          inMeetingExample: formData.inMeetingExample || null,
          category: formData.category,
          relatedTermIds: formData.relatedTermIds,
          relatedMilestoneIds: formData.relatedMilestoneIds,
        };
        await glossaryApi.update(editingTerm.id, updateData);
        toast.success('Term updated successfully');
      } else {
        // Create new term
        await glossaryApi.create(formData);
        toast.success('Term created successfully');
      }
      setIsModalOpen(false);
      loadTerms();
      loadStats();
    } catch (error) {
      console.error('Failed to save term:', error);
      toast.error(editingTerm ? 'Failed to update term' : 'Failed to create term');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete term
  const handleDelete = async (term: GlossaryTerm) => {
    if (!confirm(`Delete "${term.term}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(term.id);
    try {
      await glossaryApi.delete(term.id);
      toast.success('Term deleted successfully');
      loadTerms();
      loadStats();
    } catch (error) {
      console.error('Failed to delete term:', error);
      toast.error('Failed to delete term');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glossary Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} terms across {Object.keys(stats?.byCategory || {}).length} categories
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Term
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    CATEGORY_COLORS[category as GlossaryCategory] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {CATEGORY_LABELS[category as GlossaryCategory] || category}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="h-5 w-5 text-gray-400" />
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as GlossaryCategory | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {/* Refresh button */}
          <button
            onClick={() => {
              loadTerms();
              loadStats();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Terms List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No terms found</h3>
          <p className="text-gray-500">
            {searchQuery || categoryFilter
              ? 'Try adjusting your filters.'
              : 'Add your first glossary term to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {terms.map((term) => (
              <div
                key={term.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                          CATEGORY_COLORS[term.category] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {CATEGORY_LABELS[term.category] || term.category}
                      </span>
                      {/* Source indicator */}
                      {term.sourceArticleId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-cyan-100 text-cyan-800">
                          <Bot className="h-3 w-3" />
                          AI Generated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                          <User className="h-3 w-3" />
                          Manual
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{term.term}</h3>
                    <p className="mt-1 text-sm text-gray-600">{term.shortDefinition}</p>
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{term.fullDefinition}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Created: {formatDate(term.createdAt)}
                      {term.updatedAt !== term.createdAt && ` | Updated: ${formatDate(term.updatedAt)}`}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(term)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(term)}
                      disabled={deletingId === term.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deletingId === term.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  page === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  page === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTerm ? 'Edit Term' : 'Create New Term'}
              </h2>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSaving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Transformer"
                  maxLength={100}
                />
              </div>
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as GlossaryCategory })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Short Definition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Definition <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-500 ml-1">(for tooltips, max 200 chars)</span>
                </label>
                <input
                  type="text"
                  value={formData.shortDefinition}
                  onChange={(e) => setFormData({ ...formData, shortDefinition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="A brief definition for tooltips"
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.shortDefinition.length}/200 characters
                </p>
              </div>
              {/* Full Definition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Definition <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-500 ml-1">(2-3 sentences)</span>
                </label>
                <textarea
                  value={formData.fullDefinition}
                  onChange={(e) => setFormData({ ...formData, fullDefinition: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="A comprehensive explanation of the term"
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.fullDefinition.length}/2000 characters
                </p>
              </div>
              {/* Business Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Context
                  <span className="font-normal text-gray-500 ml-1">(why it matters to professionals)</span>
                </label>
                <textarea
                  value={formData.businessContext}
                  onChange={(e) => setFormData({ ...formData, businessContext: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Why business professionals should care about this term"
                  maxLength={1000}
                />
              </div>
              {/* Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Example
                  <span className="font-normal text-gray-500 ml-1">(real-world usage)</span>
                </label>
                <textarea
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="A practical example of how this term is used"
                  maxLength={1000}
                />
              </div>
              {/* In Meeting Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  In-Meeting Example
                  <span className="font-normal text-gray-500 ml-1">(how to use in conversation)</span>
                </label>
                <input
                  type="text"
                  value={formData.inMeetingExample}
                  onChange={(e) => setFormData({ ...formData, inMeetingExample: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Example sentence for using in meetings"
                  maxLength={1000}
                />
              </div>
            </div>
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTerm ? 'Save Changes' : 'Create Term'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlossaryAdminPage;
