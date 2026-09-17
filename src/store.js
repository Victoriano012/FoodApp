import { createDataStore } from './dataStore';

const store = createDataStore({
  readLegacy: (key) => JSON.parse(localStorage.getItem(key)),
});

export const { hydrate, getData, setData, flush, refresh } = store;

// Start alongside React hydration, reusing the fetch preload in the HTML.
// hydrate() shares this promise and surfaces failures in the loading UI.
if (typeof window !== 'undefined') hydrate().catch(() => {});
