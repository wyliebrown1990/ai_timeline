import { renderHook, waitFor } from '@testing-library/react';
import { useEntityPreview, clearEntityPreviewCache } from '../../../src/hooks/useEntityPreview';

jest.mock('../../../src/services/api', () => ({
  personsApi: { getBySlug: jest.fn() },
  organizationsApi: { getBySlug: jest.fn() },
  glossaryApi: { getBySlug: jest.fn() },
  eventsApi: { getById: jest.fn() },
}));

import { personsApi } from '../../../src/services/api';

const PERSON = { id: 'sam', canonicalName: 'Sam', slug: 'sam', shortBio: 'b' };

beforeEach(() => {
  clearEntityPreviewCache();
  jest.clearAllMocks();
});

describe('useEntityPreview module-Map cache', () => {
  it('first call fetches; second call returns cached value with no second fetch', async () => {
    (personsApi.getBySlug as jest.Mock).mockResolvedValue(PERSON);

    const first = renderHook(() => useEntityPreview('person', 'sam', true));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current.data).toEqual({ type: 'person', data: PERSON });
    expect(personsApi.getBySlug).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useEntityPreview('person', 'sam', true));
    // Cache hit — synchronous data, no isLoading flicker, no extra fetch.
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.data).toEqual({ type: 'person', data: PERSON });
    expect(personsApi.getBySlug).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useEntityPreview('person', 'sam', false));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(personsApi.getBySlug).not.toHaveBeenCalled();
  });

  it('surfaces fetch errors', async () => {
    (personsApi.getBySlug as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useEntityPreview('person', 'missing', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });
});
