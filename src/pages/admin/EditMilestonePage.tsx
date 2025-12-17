import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MilestoneForm, type MilestoneFormData } from '../../components/admin/MilestoneForm';
import { useAdminMilestones } from '../../hooks/useAdminMilestones';
import type { MilestoneResponse } from '../../types/milestone';

/**
 * Admin page for editing an existing milestone
 */
export function EditMilestonePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { milestones, updateMilestone, isLoading: milestonesLoading } = useAdminMilestones();

  const [milestone, setMilestone] = useState<MilestoneResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
    </div>
  );
}

export default EditMilestonePage;
