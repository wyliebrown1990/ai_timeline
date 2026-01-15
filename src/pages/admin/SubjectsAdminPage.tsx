import { useCallback, useEffect, useState } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  Tag,
  FolderTree,
  Hash,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  subjectsApi,
  type Subject,
  type SubjectSynonym,
} from '../../services/api';

// Level colors for badges
const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800',
  1: 'bg-purple-100 text-purple-800',
  2: 'bg-green-100 text-green-800',
};

const LEVEL_LABELS: Record<number, string> = {
  0: 'Domain',
  1: 'Category',
  2: 'Subcategory',
};

/**
 * Recursive tree node component for displaying subjects
 */
function SubjectTreeNode({
  subject,
  level,
  onEdit,
  onDelete,
  deletingId,
}: {
  subject: Subject;
  level: number;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  deletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = subject.children && subject.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${
          level === 0 ? 'bg-gray-50' : ''
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon/emoji */}
        {subject.icon ? (
          <span className="text-lg">{subject.icon}</span>
        ) : (
          <FolderTree
            className="h-4 w-4 text-gray-400"
            style={{ color: subject.color || undefined }}
          />
        )}

        {/* Name and path */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{subject.name}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[subject.level]}`}
            >
              {LEVEL_LABELS[subject.level]}
            </span>
            {subject.color && (
              <div
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: subject.color }}
              />
            )}
          </div>
          {subject.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {subject.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(subject)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(subject)}
            disabled={deletingId === subject.id}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete"
          >
            {deletingId === subject.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {subject.children!.map((child) => (
            <SubjectTreeNode
              key={child.id}
              subject={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Admin page for managing subject taxonomy
 */
export function SubjectsAdminPage() {
  // State
  const [tree, setTree] = useState<Subject[]>([]);
  const [synonyms, setSynonyms] = useState<SubjectSynonym[]>([]);
  const [flatSubjects, setFlatSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tree' | 'synonyms'>('tree');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Synonym modal state
  const [isSynonymModalOpen, setIsSynonymModalOpen] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    defaultDifficulty: '',
    color: '',
    icon: '',
    learningObjectives: [] as string[],
  });

  // Synonym form state
  const [synonymFormData, setSynonymFormData] = useState({
    term: '',
    subjectId: '',
  });

  // Flatten tree for parent selection
  const flattenTree = useCallback((subjects: Subject[], result: Subject[] = []): Subject[] => {
    for (const subject of subjects) {
      result.push(subject);
      if (subject.children && subject.children.length > 0) {
        flattenTree(subject.children, result);
      }
    }
    return result;
  }, []);

  // Load taxonomy tree
  const loadTree = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await subjectsApi.getTree();
      setTree(data);
      setFlatSubjects(flattenTree(data));
    } catch (error) {
      console.error('Failed to load taxonomy:', error);
      toast.error('Failed to load subject taxonomy');
    } finally {
      setIsLoading(false);
    }
  }, [flattenTree]);

  // Load synonyms
  const loadSynonyms = useCallback(async () => {
    try {
      const data = await subjectsApi.getSynonyms({ limit: 200 });
      setSynonyms(data.synonyms);
    } catch (error) {
      console.error('Failed to load synonyms:', error);
    }
  }, []);

  useEffect(() => {
    loadTree();
    loadSynonyms();
  }, [loadTree, loadSynonyms]);

  // Filter tree by search
  const filteredTree = searchQuery
    ? flatSubjects.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.slug.includes(searchQuery.toLowerCase()) ||
          (s.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tree;

  // Open modal for creating new subject
  const handleCreate = (parentId?: string) => {
    setEditingSubject(null);
    setFormData({
      name: '',
      description: '',
      parentId: parentId || '',
      defaultDifficulty: '',
      color: '',
      icon: '',
      learningObjectives: [],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing subject
  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      parentId: subject.parentId || '',
      defaultDifficulty: subject.defaultDifficulty || '',
      color: subject.color || '',
      icon: subject.icon || '',
      learningObjectives: subject.learningObjectives || [],
    });
    setIsModalOpen(true);
  };

  // Save subject
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSubject) {
        await subjectsApi.update(editingSubject.id, {
          name: formData.name,
          description: formData.description || undefined,
          defaultDifficulty: formData.defaultDifficulty || undefined,
          color: formData.color || undefined,
          icon: formData.icon || undefined,
          learningObjectives: formData.learningObjectives,
        });
        toast.success('Subject updated');
      } else {
        await subjectsApi.create({
          name: formData.name,
          description: formData.description || undefined,
          parentId: formData.parentId || undefined,
          defaultDifficulty: formData.defaultDifficulty || undefined,
          color: formData.color || undefined,
          icon: formData.icon || undefined,
          learningObjectives: formData.learningObjectives,
        });
        toast.success('Subject created');
      }
      setIsModalOpen(false);
      loadTree();
    } catch (error) {
      console.error('Failed to save subject:', error);
      toast.error(editingSubject ? 'Failed to update subject' : 'Failed to create subject');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete subject
  const handleDelete = async (subject: Subject) => {
    if (subject.children && subject.children.length > 0) {
      toast.error('Cannot delete subject with children. Delete children first.');
      return;
    }

    if (!confirm(`Delete "${subject.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(subject.id);
    try {
      await subjectsApi.delete(subject.id);
      toast.success('Subject deleted');
      loadTree();
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast.error('Failed to delete subject');
    } finally {
      setDeletingId(null);
    }
  };

  // Create synonym
  const handleCreateSynonym = async () => {
    if (!synonymFormData.term.trim()) {
      toast.error('Term is required');
      return;
    }
    if (!synonymFormData.subjectId) {
      toast.error('Subject is required');
      return;
    }

    setIsSaving(true);
    try {
      await subjectsApi.createSynonym({
        term: synonymFormData.term,
        subjectId: synonymFormData.subjectId,
      });
      toast.success('Synonym created');
      setIsSynonymModalOpen(false);
      setSynonymFormData({ term: '', subjectId: '' });
      loadSynonyms();
    } catch (error) {
      console.error('Failed to create synonym:', error);
      toast.error('Failed to create synonym');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete synonym
  const handleDeleteSynonym = async (synonym: SubjectSynonym) => {
    if (!confirm(`Delete synonym "${synonym.term}"?`)) {
      return;
    }

    try {
      await subjectsApi.deleteSynonym(synonym.id);
      toast.success('Synonym deleted');
      loadSynonyms();
    } catch (error) {
      console.error('Failed to delete synonym:', error);
      toast.error('Failed to delete synonym');
    }
  };

  // Stats
  const stats = {
    domains: tree.length,
    categories: tree.reduce((acc, d) => acc + (d.children?.length || 0), 0),
    subcategories: tree.reduce(
      (acc, d) =>
        acc +
        (d.children?.reduce((acc2, c) => acc2 + (c.children?.length || 0), 0) || 0),
      0
    ),
    synonyms: synonyms.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Taxonomy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage subject hierarchy for content classification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSynonymModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <Tag className="h-4 w-4" />
            Add Synonym
          </button>
          <button
            onClick={() => handleCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <BookMarked className="h-4 w-4" />
            <span className="text-sm font-medium">Domains</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.domains}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <FolderTree className="h-4 w-4" />
            <span className="text-sm font-medium">Categories</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Hash className="h-4 w-4" />
            <span className="text-sm font-medium">Subcategories</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.subcategories}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Tag className="h-4 w-4" />
            <span className="text-sm font-medium">Synonyms</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.synonyms}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tree')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tree'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Taxonomy Tree
            </div>
          </button>
          <button
            onClick={() => setActiveTab('synonyms')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'synonyms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Synonyms ({synonyms.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'tree' ? 'Search subjects...' : 'Search synonyms...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => {
              loadTree();
              loadSynonyms();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'tree' ? (
        // Tree View
        isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          // Flat filtered list
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {(filteredTree as Subject[]).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No subjects match your search
              </div>
            ) : (
              (filteredTree as Subject[]).map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50"
                >
                  {subject.icon ? (
                    <span className="text-lg">{subject.icon}</span>
                  ) : (
                    <FolderTree
                      className="h-4 w-4 text-gray-400"
                      style={{ color: subject.color || undefined }}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{subject.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[subject.level]}`}
                      >
                        {LEVEL_LABELS[subject.level]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{subject.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(subject)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Tree hierarchy
          <div className="bg-white rounded-xl border border-gray-200 py-2">
            {(filteredTree as Subject[]).map((domain) => (
              <SubjectTreeNode
                key={domain.id}
                subject={domain}
                level={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </div>
        )
      ) : (
        // Synonyms View
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {synonyms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Tag className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No synonyms defined yet</p>
            </div>
          ) : (
            synonyms
              .filter(
                (s) =>
                  !searchQuery ||
                  s.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.subject?.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((synonym) => (
                <div
                  key={synonym.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50"
                >
                  <Tag className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{synonym.term}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    {synonym.subject ? (
                      <span className="text-blue-600">{synonym.subject.name}</span>
                    ) : (
                      <span className="text-gray-400">Unknown subject</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSynonym(synonym)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {/* Create/Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Natural Language Processing"
                />
              </div>

              {/* Parent (only for create) */}
              {!editingSubject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Subject
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None (Top-level Domain)</option>
                    {flatSubjects
                      .filter((s) => s.level < 2) // Can't add children to subcategories
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {'  '.repeat(subject.level)}
                          {subject.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to create a top-level domain, or select a parent for
                    category/subcategory
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this subject area"
                />
              </div>

              {/* Default Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Difficulty
                </label>
                <select
                  value={formData.defaultDifficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultDifficulty: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Not Set</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Color and Icon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g., brain emoji"
                    maxLength={10}
                  />
                </div>
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
                {editingSubject ? 'Save Changes' : 'Create Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Synonym Modal */}
      {isSynonymModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSaving && setIsSynonymModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Synonym</h2>
              <button
                onClick={() => !isSaving && setIsSynonymModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSaving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternative Term <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={synonymFormData.term}
                  onChange={(e) =>
                    setSynonymFormData({ ...synonymFormData, term: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., LLMs, GPT, Deep Learning"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Common variations, abbreviations, or alternative names
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maps To Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={synonymFormData.subjectId}
                  onChange={(e) =>
                    setSynonymFormData({ ...synonymFormData, subjectId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a subject...</option>
                  {flatSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.path}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsSynonymModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSynonym}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Synonym
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubjectsAdminPage;
