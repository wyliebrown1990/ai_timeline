import { useCallback } from 'react';
import type { CreateMilestoneDto, UpdateMilestoneDto, MilestoneResponse } from '../types/milestone';
import { useMilestones, useMilestoneMutation } from './useMilestones';

/**
 * Combined hook return type for admin milestone operations
 */
interface UseAdminMilestonesReturn {
  /** List of milestones */
  milestones: MilestoneResponse[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch the milestones list */
  refetch: () => Promise<void>;
  /** Create a new milestone */
  createMilestone: (data: CreateMilestoneDto) => Promise<MilestoneResponse | null>;
  /** Update an existing milestone */
  updateMilestone: (id: string, data: UpdateMilestoneDto) => Promise<MilestoneResponse | null>;
  /** Delete a milestone */
  deleteMilestone: (id: string) => Promise<boolean>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

/**
 * Combined hook for admin milestone management
 * Provides list data and CRUD operations with automatic refetch
 */
export function useAdminMilestones(): UseAdminMilestonesReturn {
  const { data, isLoading, error, refetch } = useMilestones();
  const { create, update, remove, mutation } = useMilestoneMutation();

  // Create milestone and refetch list
  const createMilestone = useCallback(
    async (data: CreateMilestoneDto): Promise<MilestoneResponse | null> => {
      const result = await create(data);
      if (result) {
        await refetch();
      }
      return result;
    },
    [create, refetch]
  );

  // Update milestone and refetch list
  const updateMilestone = useCallback(
    async (id: string, updateData: UpdateMilestoneDto): Promise<MilestoneResponse | null> => {
      const result = await update(id, updateData);
      if (result) {
        await refetch();
      }
      return result;
    },
    [update, refetch]
  );

  // Delete milestone and refetch list
  const deleteMilestone = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await remove(id);
      if (success) {
        await refetch();
      }
      return success;
    },
    [remove, refetch]
  );

  return {
    milestones: data ?? [],
    isLoading,
    error,
    refetch,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    isMutating: mutation.isLoading,
  };
}
