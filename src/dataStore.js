import { DATA_KEYS } from './dataKeys.js';

const SAVE_DELAY = 800;
const MAX_RETRY_DELAY = 30_000;

// Keep synchronization separate from React and inject I/O for race-condition tests.
export function createDataStore({ request = (...args) => fetch(...args), readLegacy = () => null } = {}) {
  let cache = {};
  const dirty = new Set();
  let timer;
  let hydration;
  let saving;
  let refreshing;
  let revision = 0;
  let retryDelay = SAVE_DELAY;

  async function load() {
    const response = await request('/api/data');
    if (!response.ok) throw new Error('Could not load your data');
    return response.json();
  }

  function scheduleSave(delay = SAVE_DELAY) {
    clearTimeout(timer);
    timer = setTimeout(() => flush(), delay);
  }

  function hydrate() {
    if (!hydration) {
      hydration = load().then((data) => {
        cache = data;
        // Adopt the old localStorage app's data only for an empty account.
        if (Object.keys(cache).length === 0) {
          for (const key of DATA_KEYS) {
            try {
              const legacy = readLegacy(key);
              if (legacy) {
                cache[key] = legacy;
                dirty.add(key);
              }
            } catch { /* Storage may be unavailable or contain invalid JSON. */ }
          }
          if (dirty.size) scheduleSave();
        }
      }).catch((error) => {
        hydration = undefined;
        throw error;
      });
    }
    return hydration;
  }

  function getData(key) {
    return cache[key] ?? null;
  }

  function setData(key, value) {
    cache[key] = value;
    revision += 1;
    dirty.add(key);
    scheduleSave();
  }

  function flush(keepalive = false) {
    // Serialize writes so an older slow request cannot land after a newer one.
    if (saving) return saving.then(() => flush(keepalive));
    clearTimeout(timer);
    if (!dirty.size) return Promise.resolve();

    const payload = Object.fromEntries([...dirty].map((key) => [key, cache[key]]));
    const body = JSON.stringify(payload);
    dirty.clear();
    saving = Promise.resolve().then(async () => {
      try {
        const response = await request('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive,
        });
        if (!response.ok) throw new Error('Could not save your data');
        retryDelay = SAVE_DELAY;
      } catch {
        // HTTP and network failures retry using the latest cache values.
        for (const key of Object.keys(payload)) dirty.add(key);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
      } finally {
        saving = undefined;
        if (dirty.size) scheduleSave(retryDelay);
      }
    });
    return saving;
  }

  function refresh() {
    if (dirty.size || saving) return Promise.resolve(false);
    if (refreshing) return refreshing;
    const startedAt = revision;
    refreshing = (async () => {
      try {
        const fresh = await load();
        // An edit may already have been saved while this GET was in flight.
        if (revision !== startedAt || dirty.size || saving) return false;
        if (JSON.stringify(fresh) === JSON.stringify(cache)) return false;
        cache = fresh;
        return true;
      } catch {
        // Returning offline must leave the current screen usable.
        return false;
      } finally {
        refreshing = undefined;
      }
    })();
    return refreshing;
  }

  return { hydrate, getData, setData, flush, refresh };
}
