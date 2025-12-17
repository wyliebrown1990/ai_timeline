import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MilestoneCategory as MilestoneCategoryType } from '../../types/milestone';
import { MilestoneCategory, SignificanceLevel } from '../../types/milestone';
import { categoryLabels, significanceLabels } from '../../utils/timelineUtils';

/** Form data type definition */
export interface MilestoneFormData {
  title: string;
  date: string;
  description: string;
  category: MilestoneCategoryType;
  significance: number;
  organization?: string;
  contributors?: string[];
  sourceUrl?: string;
  imageUrl?: string;
  tags?: string[];
}

/** Form validation schema */
const milestoneFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  date: z.string().min(1, 'Date is required'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description is too long'),
  category: z.nativeEnum(MilestoneCategory, {
    error: 'Please select a category',
  }),
  significance: z
    .union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
    .pipe(z.number().min(1, 'Please select significance').max(4, 'Invalid significance')),
  organization: z.string().optional(),
  contributors: z.array(z.string()).optional(),
  sourceUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  imageUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

interface MilestoneFormProps {
  /** Initial form values for editing */
  initialData?: Partial<MilestoneFormData>;
  /** Form submission handler */
  onSubmit: (data: MilestoneFormData) => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether form is submitting */
  isLoading?: boolean;
}

/**
 * Reusable form component for creating/editing milestones
 */
export function MilestoneForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: MilestoneFormProps) {
  const [tagInput, setTagInput] = useState('');
  const [contributorInput, setContributorInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MilestoneFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(milestoneFormSchema) as any,
    defaultValues: {
      title: initialData?.title || '',
      date: initialData?.date || '',
      description: initialData?.description || '',
      category: initialData?.category,
      significance: initialData?.significance || 0,
      organization: initialData?.organization || '',
      contributors: initialData?.contributors || [],
      sourceUrl: initialData?.sourceUrl || '',
      imageUrl: initialData?.imageUrl || '',
      tags: initialData?.tags || [],
    },
  });

  const tags = watch('tags') || [];
  const contributors = watch('contributors') || [];
  const significance = watch('significance');

  // Handle adding tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue('tags', [...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      'tags',
      tags.filter((t) => t !== tag)
    );
  };

  // Handle adding contributors
  const addContributor = () => {
    const trimmed = contributorInput.trim();
    if (trimmed && !contributors.includes(trimmed)) {
      setValue('contributors', [...contributors, trimmed]);
      setContributorInput('');
    }
  };

  const removeContributor = (contributor: string) => {
    setValue(
      'contributors',
      contributors.filter((c) => c !== contributor)
    );
  };

  return (
    <form
      data-testid="milestone-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register('title')}
          id="title"
          type="text"
          data-testid="input-title"
          className={`
            w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.title ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder="Enter milestone title"
        />
        {errors.title && (
          <p data-testid="error-title" className="mt-1 text-sm text-red-600">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Date <span className="text-red-500">*</span>
        </label>
        <input
          {...register('date')}
          id="date"
          type="date"
          data-testid="input-date"
          className={`
            w-full rounded-lg border px-4 py-2.5 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.date ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {errors.date && (
          <p data-testid="error-date" className="mt-1 text-sm text-red-600">
            {errors.date.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          id="description"
          data-testid="input-description"
          rows={4}
          className={`
            w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder-gray-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.description ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder="Describe the milestone..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Category and Significance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category')}
            id="category"
            data-testid="select-category"
            className={`
              w-full rounded-lg border px-4 py-2.5 text-gray-900 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${errors.category ? 'border-red-500' : 'border-gray-300'}
            `}
          >
            <option value="">Select category</option>
            {Object.values(MilestoneCategory).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Significance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Significance <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {Object.values(SignificanceLevel)
              .filter((v) => typeof v === 'number')
              .map((level) => (
                <label
                  key={level}
                  className={`
                    flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                    ${
                      significance === level
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    {...register('significance')}
                    type="radio"
                    value={level}
                    data-testid={`significance-${level}`}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {significanceLabels[level as SignificanceLevel]}
                  </span>
                </label>
              ))}
          </div>
          {errors.significance && (
            <p className="mt-1 text-sm text-red-600">
              {errors.significance.message}
            </p>
          )}
        </div>
      </div>

      {/* Organization */}
      <div>
        <label
          htmlFor="organization"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Organization
        </label>
        <input
          {...register('organization')}
          id="organization"
          type="text"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., OpenAI, Google, MIT"
        />
      </div>

      {/* Contributors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contributors
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={contributorInput}
            onChange={(e) => setContributorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addContributor();
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add contributor and press Enter"
          />
          <button
            type="button"
            onClick={addContributor}
            className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Add
          </button>
        </div>
        {contributors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {contributors.map((contributor) => (
              <span
                key={contributor}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full"
              >
                {contributor}
                <button
                  type="button"
                  onClick={() => removeContributor(contributor)}
                  className="hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source URL */}
      <div>
        <label
          htmlFor="sourceUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Source URL
        </label>
        <input
          {...register('sourceUrl')}
          id="sourceUrl"
          type="url"
          className={`
            w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.sourceUrl ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder="https://..."
        />
        {errors.sourceUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.sourceUrl.message}</p>
        )}
      </div>

      {/* Image URL */}
      <div>
        <label
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Image URL
        </label>
        <input
          {...register('imageUrl')}
          id="imageUrl"
          type="url"
          className={`
            w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.imageUrl ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder="https://..."
        />
        {errors.imageUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            data-testid="input-tags"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-gray-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="submit-btn"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Save Changes' : 'Create Milestone'}
        </button>
      </div>
    </form>
  );
}

export default MilestoneForm;
