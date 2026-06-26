function canUseWindow(): boolean {
  return typeof window !== 'undefined';
}

export function safeGetLocalStorage(key: string): string | null {
  if (!canUseWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetLocalStorage(key: string, value: string): boolean {
  if (!canUseWindow()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveLocalStorage(key: string): boolean {
  if (!canUseWindow()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeGetSessionStorage(key: string): string | null {
  if (!canUseWindow()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSessionStorage(key: string, value: string): boolean {
  if (!canUseWindow()) return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveSessionStorage(key: string): boolean {
  if (!canUseWindow()) return false;
  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
