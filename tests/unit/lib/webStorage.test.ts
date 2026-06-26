import {
  safeGetLocalStorage,
  safeGetSessionStorage,
  safeSetLocalStorage,
  safeSetSessionStorage,
} from '../../../src/lib/webStorage';

describe('webStorage', () => {
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      configurable: true,
    });
  });

  it('returns null when localStorage access throws', () => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Access to storage is not allowed from this context.');
      },
      configurable: true,
    });

    expect(safeGetLocalStorage('theme')).toBeNull();
    expect(safeSetLocalStorage('theme', 'dark')).toBe(false);
  });

  it('returns null when sessionStorage access throws', () => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('Access to storage is not allowed from this context.');
      },
      configurable: true,
    });

    expect(safeGetSessionStorage('token')).toBeNull();
    expect(safeSetSessionStorage('token', 'abc')).toBe(false);
  });
});
