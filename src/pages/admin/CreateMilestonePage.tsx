import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MilestoneForm, type MilestoneFormData } from '../../components/admin/MilestoneForm';
import { useAdminMilestones } from '../../hooks/useAdminMilestones';
import { useState } from 'react';

/**
 * Admin page for creating a new milestone
 */
export function CreateMilestonePage() {
  const navigate = useNavigate();
  const { createMilestone } = useAdminMilestones();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (data: MilestoneFormData) => {
    setIsSubmitting(true);
    try {
      await createMilestone({
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
      toast.success('Milestone created successfully');
      navigate('/admin/milestones');
    } catch (error) {
      toast.error('Failed to create milestone');
      console.error('Create error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/admin/milestones');
  };

  return (
    <div data-testid="create-milestone-page" className="max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Milestone</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new milestone to the AI timeline
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MilestoneForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

export default CreateMilestonePage;
