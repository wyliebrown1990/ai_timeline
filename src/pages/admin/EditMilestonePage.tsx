import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MilestoneForm, type MilestoneFormData } from '../../components/admin/MilestoneForm';
import { useAdminMilestones } from '../../hooks/useAdminMilestones';
import { milestonesApi, personsApi, type MilestoneContributor } from '../../services/api';
import type { Person } from '../../types/person';
import type { MilestoneResponse } from '../../types/milestone';

/**
 * Admin page for editing an existing milestone
 */
// Contribution type options
const CONTRIBUTION_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'co_author', label: 'Co-author' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'founder', label: 'Founder' },
  { value: 'mentioned', label: 'Mentioned' },
];

export function EditMilestonePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { milestones, updateMilestone, isLoading: milestonesLoading } = useAdminMilestones();

  const [milestone, setMilestone] = useState<MilestoneResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Sprint KPC-3: Contributor state
  const [contributors, setContributors] = useState<MilestoneContributor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContributionType, setSelectedContributionType] = useState('mentioned');
  const [contributorsLoading, setContributorsLoading] = useState(false);

  // Find milestone when milestones load
  useEffect(() => {
    if (milestonesLoading) return;

    const found = milestones.find((m) => m.id === id);
    if (found) {
      setMilestone(found);
    } else {
      setNotFound(true);
    }
  }, [id, milestones, milestonesLoading]);

  // Load contributors when milestone is found
  useEffect(() => {
    if (!id) return;

    const loadContributors = async () => {
      setContributorsLoading(true);
      try {
        const result = await milestonesApi.getContributors(id);
        setContributors(result.data);
      } catch (error) {
        console.error('Failed to load contributors:', error);
      } finally {
        setContributorsLoading(false);
      }
    };

    loadContributors();
  }, [id]);

  // Search persons with debounce
  const searchPersons = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await personsApi.search(query, 10);
      // Filter out already-added contributors
      const filteredResults = result.data.filter(
        (p) => !contributors.some((c) => c.id === p.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [contributors]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPersons(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPersons]);

  // Add contributor
  const handleAddContributor = async (person: Person) => {
    if (!id) return;

    try {
      const result = await milestonesApi.addContributor(id, person.id, selectedContributionType);
      setContributors(result.data);
      setSearchQuery('');
      setSearchResults([]);
      toast.success(`Added ${person.canonicalName} as contributor`);
    } catch (error) {
      console.error('Failed to add contributor:', error);
      toast.error('Failed to add contributor');
    }
  };

  // Remove contributor
  const handleRemoveContributor = async (personId: string, personName: string) => {
    if (!id) return;

    try {
      await milestonesApi.removeContributor(id, personId);
      setContributors((prev) => prev.filter((c) => c.id !== personId));
      toast.success(`Removed ${personName}`);
    } catch (error) {
      console.error('Failed to remove contributor:', error);
      toast.error('Failed to remove contributor');
    }
  };

  // Handle form submission
  const handleSubmit = async (data: MilestoneFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      await updateMilestone(id, {
        title: data.title,
        date: data.date,
        description: data.description,
        category: data.category,
        significance: data.significance,
        organization: data.organization || undefined,
        contributors: data.contributors?.length ? data.contributors : undefined,
        sourceUrl: data.sourceUrl || undefined,
        imageUrl: data.imageUrl || undefined,
        tags: data.tags?.length ? data.tags : undefined,
      });
      toast.success('Milestone updated successfully');
      navigate('/admin/milestones');
    } catch (error) {
      toast.error('Failed to update milestone');
      console.error('Update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/admin/milestones');
  };

  // Loading state
  if (milestonesLoading) {
    return (
      <div data-testid="edit-milestone-page" className="max-w-3xl">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div data-testid="edit-milestone-page" className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Milestone Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            The milestone you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/admin/milestones')}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Milestones
          </button>
        </div>
      </div>
    );
  }

  // Convert milestone to form data format
  const initialData: Partial<MilestoneFormData> = milestone
    ? {
        title: milestone.title,
        date: milestone.date.split('T')[0], // Convert to YYYY-MM-DD
        description: milestone.description,
        category: milestone.category,
        significance: milestone.significance,
        organization: milestone.organization || '',
        contributors: milestone.contributors || [],
        sourceUrl: milestone.sourceUrl || '',
        imageUrl: milestone.imageUrl || '',
        tags: milestone.tags || [],
      }
    : {};

  return (
    <div data-testid="edit-milestone-page" className="max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Milestone</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update milestone details
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {milestone && (
          <MilestoneForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        )}
      </div>

      {/* Sprint KPC-3: Contributors section */}
      {milestone && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Linked Contributors
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Link persons to this milestone. These appear on the milestone detail and on person profiles.
          </p>

          {/* Search and add section */}
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a person to add..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <select
                value={selectedContributionType}
                onChange={(e) => setSelectedContributionType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CONTRIBUTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleAddContributor(person)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0">
                      {person.canonicalName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">
                        {person.canonicalName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {person.currentRole || person.role}
                      </div>
                    </div>
                    <span className="text-blue-600 text-sm">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-gray-500 mt-2">
                No matching persons found. Try a different search term.
              </p>
            )}
          </div>

          {/* Current contributors list */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current Contributors ({contributors.length})
            </h3>
            {contributorsLoading ? (
              <div className="py-4 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : contributors.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-300 rounded-lg">
                No linked contributors yet. Use the search above to add people.
              </p>
            ) : (
              <div className="space-y-2">
                {contributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {contributor.imageUrl ? (
                        <img
                          src={contributor.imageUrl}
                          alt={contributor.canonicalName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        contributor.canonicalName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/people/${contributor.slug}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {contributor.canonicalName}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {CONTRIBUTION_TYPES.find((t) => t.value === contributor.contributionType)?.label || contributor.contributionType}
                        </span>
                        {contributor.currentRole && (
                          <span className="text-xs text-gray-500">
                            {contributor.currentRole}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveContributor(contributor.id, contributor.canonicalName)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove contributor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legacy contributors display */}
          {milestone.contributors && milestone.contributors.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Legacy Contributors (from text field)
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                These are stored as text. Consider linking them to Person records above.
              </p>
              <div className="flex flex-wrap gap-2">
                {milestone.contributors.map((name, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EditMilestonePage;
