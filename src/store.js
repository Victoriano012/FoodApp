// Server-backed replacement for localStorage. The app hydrates the whole
// dataset into this in-memory cache before rendering, reads and writes it
// synchronously exactly like it used to use localStorage, and edits are
// debounce-saved to /api/data (per user, keyed by the Google login).

const DATA_KEYS = ['recipes', 'ingredients', 'shoppingList', 'shoppingRecipes'];

let cache = {};
const dirty = new Set();
let timer = null;

export async function hydrate() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('load failed');
  cache = await res.json();
  // First login from a device that used the localStorage version: adopt its data
  if (Object.keys(cache).length === 0) {
    for (const key of DATA_KEYS) {
      try {
        const legacy = JSON.parse(localStorage.getItem(key));
        if (legacy) {
          cache[key] = legacy;
          dirty.add(key);
        }
      } catch { /* ignore unparsable leftovers */ }
    }
    if (dirty.size) scheduleSave();
  }
}

export function getData(key) {
  return cache[key] ?? null;
}

export function setData(key, value) {
  cache[key] = value;
  dirty.add(key);
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(flush, 800);
}

export function flush(keepalive = false) {
  if (!dirty.size) return Promise.resolve();
  clearTimeout(timer);
  const payload = {};
  for (const key of dirty) payload[key] = cache[key];
  dirty.clear();
  return fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  }).then(
    (res) => {
      if (!res.ok) throw new Error(res.statusText);
    },
    () => {
      // Failed (offline, signed out...): keep the keys dirty so the next
      // edit or flush retries them
      for (const key of Object.keys(payload)) dirty.add(key);
      scheduleSave();
    }
  );
}

// Re-fetch from the server (another device may have edited meanwhile).
// Returns true when the data changed; never clobbers unsaved local edits.
export async function refresh() {
  if (dirty.size) return false;
  const res = await fetch('/api/data');
  if (!res.ok) return false;
  const fresh = await res.json();
  if (dirty.size || JSON.stringify(fresh) === JSON.stringify(cache)) return false;
  cache = fresh;
  return true;
}
