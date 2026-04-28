import { useEffect, useState } from 'react';
import {
  personsApi,
  organizationsApi,
  glossaryApi,
  eventsApi,
  type PersonWithRelations,
  type OrganizationWithRelations,
  type GlossaryTerm,
  type EventPageData,
} from '../services/api';

export type EntityType = 'person' | 'organization' | 'glossary' | 'milestone';

export type EntityPayload =
  | { type: 'person'; data: PersonWithRelations }
  | { type: 'organization'; data: OrganizationWithRelations }
  | { type: 'glossary'; data: GlossaryTerm }
  | { type: 'milestone'; data: EventPageData };

// Module-scoped cache: persists across mounts during an SPA session.
// Sticky-by-design (matches useGlossaryApi pattern); entity records are
// effectively immutable within a session.
const entityPreviewCache = new Map<string, EntityPayload>();

function cacheKey(type: EntityType, slug: string): string {
  return `${type}:${slug}`;
}

export function getCachedEntity(type: EntityType, slug: string): EntityPayload | undefined {
  return entityPreviewCache.get(cacheKey(type, slug));
}

export function clearEntityPreviewCache(): void {
  entityPreviewCache.clear();
}

async function fetchEntity(type: EntityType, slug: string): Promise<EntityPayload> {
  if (type === 'person') {
    const data = await personsApi.getBySlug(slug);
    return { type: 'person', data };
  }
  if (type === 'organization') {
    const data = await organizationsApi.getBySlug(slug);
    return { type: 'organization', data };
  }
  if (type === 'glossary') {
    const data = await glossaryApi.getBySlug(slug);
    return { type: 'glossary', data };
  }
  // milestone — uses /api/events/:id (eventsApi), the only endpoint that returns `tldr`.
  const data = await eventsApi.getById(slug);
  return { type: 'milestone', data };
}

interface UseEntityPreviewResult {
  data: EntityPayload | null;
  isLoading: boolean;
  error: Error | null;
}

export function useEntityPreview(
  type: EntityType,
  slug: string,
  enabled: boolean
): UseEntityPreviewResult {
  const cached = enabled ? entityPreviewCache.get(cacheKey(type, slug)) : undefined;

  const [data, setData] = useState<EntityPayload | null>(cached ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const hit = entityPreviewCache.get(cacheKey(type, slug));
    if (hit) {
      setData(hit);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchEntity(type, slug)
      .then((payload) => {
        if (cancelled || controller.signal.aborted) return;
        entityPreviewCache.set(cacheKey(type, slug), payload);
        setData(payload);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [type, slug, enabled]);

  return { data, isLoading, error };
}
