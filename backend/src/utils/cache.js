const cacheStore = new Map();

export function getCache(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key, value, ttlMs = 30000) {
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache(key) {
  if (key) {
    cacheStore.delete(key);
  } else {
    cacheStore.clear();
  }
}
