import { useState, useEffect, useCallback } from 'react';
import type { MilestoneResponse, CreateMilestoneDto, UpdateMilestoneDto } from '../types/milestone';
import type { PaginatedResponse, MilestoneQueryParams } from '../services/api';
import { milestonesApi, ApiError } from '../services/api';

/**
 * State for async data fetching operations
 */
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook return type for milestone list operations
 */
interface UseMilestonesReturn extends AsyncState<MilestoneResponse[]> {
  pagination: PaginatedResponse<MilestoneResponse>['pagination'] | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching all milestones with pagination
 * @param params - Optional query parameters for pagination
 */
export function useMilestones(params?: MilestoneQueryParams): UseMilestonesReturn {
  const [state, setState] = useState<AsyncState<MilestoneResponse[]>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [pagination, setPagination] = useState<UseMilestonesReturn['pagination']>(null);

  const page = params?.page;
  const limit = params?.limit;

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await milestonesApi.getAll({ page, limit });
      setState({ data: response.data, isLoading: false, error: null });
      setPagination(response.pagination);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch milestones';
      setState({ data: null, isLoading: false, error: message });
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    pagination,
    refetch: fetchData,
  };
}

/**
 * Hook return type for single milestone operations
 */
interface UseMilestoneReturn extends AsyncState<MilestoneResponse> {
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single milestone by ID
 * @param id - Milestone ID to fetch
 */
export function useMilestone(id: string | null): UseMilestoneReturn {
  const [state, setState] = useState<AsyncState<MilestoneResponse>>({
    data: null,
    isLoading: !!id,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!id) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const milestone = await milestonesApi.getById(id);
      setState({ data: milestone, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch milestone';
      setState({ data: null, isLoading: false, error: message });
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

/**
 * Mutation result type
 */
interface MutationResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook return type for milestone mutations
 */
interface UseMilestoneMutationReturn {
  create: (data: CreateMilestoneDto) => Promise<MilestoneResponse | null>;
  update: (id: string, data: UpdateMilestoneDto) => Promise<MilestoneResponse | null>;
  remove: (id: string) => Promise<boolean>;
  mutation: MutationResult<MilestoneResponse>;
  reset: () => void;
}

/**
 * Hook for creating, updating, and deleting milestones
 */
export function useMilestoneMutation(): UseMilestoneMutationReturn {
  const [mutation, setMutation] = useState<MutationResult<MilestoneResponse>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const reset = useCallback(() => {
    setMutation({ data: null, isLoading: false, error: null });
  }, []);

  const create = useCallback(async (data: CreateMilestoneDto): Promise<MilestoneResponse | null> => {
    setMutation({ data: null, isLoading: true, error: null });

    try {
      const milestone = await milestonesApi.create(data);
      setMutation({ data: milestone, isLoading: false, error: null });
      return milestone;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create milestone';
      setMutation({ data: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  const update = useCallback(
    async (id: string, data: UpdateMilestoneDto): Promise<MilestoneResponse | null> => {
      setMutation({ data: null, isLoading: true, error: null });

      try {
        const milestone = await milestonesApi.update(id, data);
        setMutation({ data: milestone, isLoading: false, error: null });
        return milestone;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to update milestone';
        setMutation({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setMutation({ data: null, isLoading: true, error: null });

    try {
      await milestonesApi.delete(id);
      setMutation({ data: null, isLoading: false, error: null });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete milestone';
      setMutation({ data: null, isLoading: false, error: message });
      return false;
    }
  }, []);

  return {
    create,
    update,
    remove,
    mutation,
    reset,
  };
}
