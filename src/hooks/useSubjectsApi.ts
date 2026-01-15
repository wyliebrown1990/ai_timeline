/**
 * Subject API Hooks
 * Sprint Subj-5 - UI & Discovery
 *
 * React hooks for fetching subject data
 */

import { useState, useEffect } from 'react';
import { subjectsApi, type Subject, type ContentSubjectAssignment } from '../services/api';

/**
 * Hook to get subjects assigned to a piece of content
 * Used for displaying subject badges on content cards
 */
export function useSubjectsForContent(
  contentType: string,
  contentId: string | undefined,
  options?: { enabled?: boolean }
) {
  const [data, setData] = useState<ContentSubjectAssignment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!contentId || !enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    subjectsApi
      .getSubjectsForContent(contentType, contentId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useSubjectsForContent] Error:', err);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentType, contentId, enabled]);

  // Get the primary subject
  const primarySubject = data?.find((s) => s.isPrimary)?.subject ?? null;

  // Get all subjects (with subject data populated)
  const subjects = data?.filter((s) => s.subject).map((s) => s.subject as Subject) ?? [];

  return {
    data,
    subjects,
    primarySubject,
    isLoading,
    error,
  };
}

/**
 * Hook to get the full subject taxonomy tree
 */
export function useSubjectTree() {
  const [data, setData] = useState<Subject[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    subjectsApi
      .getTree()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useSubjectTree] Error:', err);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

/**
 * Hook to search subjects
 */
export function useSubjectSearch(query: string, options?: { enabled?: boolean; minLength?: number }) {
  const [data, setData] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;
  const minLength = options?.minLength ?? 2;

  useEffect(() => {
    if (!enabled || query.length < minLength) {
      setData([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    subjectsApi
      .search(query)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useSubjectSearch] Error:', err);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, enabled, minLength]);

  return { data, isLoading, error };
}

/**
 * Hook to get a single subject by slug
 */
export function useSubject(slug: string | undefined) {
  const [data, setData] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    subjectsApi
      .getBySlug(slug)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useSubject] Error:', err);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, isLoading, error };
}
