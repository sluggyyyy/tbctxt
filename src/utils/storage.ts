export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Failed to get item from localStorage: ${key}`, e);
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to set item in localStorage: ${key}`, e);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove item from localStorage: ${key}`, e);
  }
}
