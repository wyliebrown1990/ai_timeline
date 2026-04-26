import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Minimal chrome.* shim for tests
type StorageBackend = Map<string, unknown>;
const storageBackends: Record<'local' | 'session', StorageBackend> = {
  local: new Map(),
  session: new Map(),
};

function makeArea(area: 'local' | 'session') {
  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      const backend = storageBackends[area];
      const result: Record<string, unknown> = {};
      if (keys == null) {
        for (const [k, v] of backend) result[k] = v;
        return result;
      }
      const list = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys);
      for (const k of list) {
        if (backend.has(k)) result[k] = backend.get(k);
        else if (typeof keys === 'object' && keys !== null && !Array.isArray(keys)) {
          result[k] = (keys as Record<string, unknown>)[k];
        }
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      const backend = storageBackends[area];
      for (const [k, v] of Object.entries(items)) backend.set(k, v);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const backend = storageBackends[area];
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) backend.delete(k);
    }),
    clear: vi.fn(async () => {
      storageBackends[area].clear();
    }),
  };
}

// Provide a minimal global chrome stub used by the popup + lib code
(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: makeArea('local'),
    session: makeArea('session'),
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    getURL: (p: string) => `chrome-extension://test/${p}`,
    lastError: undefined,
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

beforeEach(() => {
  storageBackends.local.clear();
  storageBackends.session.clear();
  vi.clearAllMocks();
});
