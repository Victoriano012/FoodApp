import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDataStore } from '../src/dataStore.js';

const response = (data = {}, ok = true) => ({ ok, json: async () => data });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function setup(t, initial = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  let next = () => response(structuredClone(initial));
  const store = createDataStore({ request: async (url, options) => {
    calls.push({ url, ...options });
    return next(url, options);
  } });
  return { store, calls, reply: (fn) => { next = fn; } };
}

test('hydration is shared, and failed hydration can be retried', async (t) => {
  const { store, calls, reply } = setup(t);
  reply(() => { throw new Error('offline'); });
  const first = store.hydrate();
  assert.equal(store.hydrate(), first);
  await assert.rejects(first);
  reply(() => response({ recipes: [] }));
  await store.hydrate();
  assert.deepEqual(store.getData('recipes'), []);
  assert.equal(calls.length, 2);
});

test('rapid edits debounce into one save of the latest values', async (t) => {
  const { store, calls } = setup(t);
  await store.hydrate();
  store.setData('recipes', ['old']);
  t.mock.timers.tick(400);
  store.setData('recipes', ['new']);
  store.setData('shoppingList', ['apple']);
  t.mock.timers.tick(799);
  assert.equal(calls.length, 1);
  t.mock.timers.tick(1);
  await store.flush();
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1].body), { recipes: ['new'], shoppingList: ['apple'] });
});

test('overlapping saves are serialized and refresh skips a pending save', async (t) => {
  const { store, calls, reply } = setup(t);
  await store.hydrate();
  const firstWrite = deferred();
  reply(() => firstWrite.promise);
  store.setData('recipes', ['first']);
  const first = store.flush();
  assert.equal(await store.refresh(), false);
  store.setData('recipes', ['second']);
  const second = store.flush(true);
  assert.equal(calls.length, 2);
  reply(() => response());
  firstWrite.resolve(response());
  await Promise.all([first, second]);
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[2].body), { recipes: ['second'] });
  assert.equal(calls[2].keepalive, true);
});

for (const failure of ['http', 'network']) {
  test(`${failure} failures retry the newest edit without dropping other collections`, async (t) => {
    const { store, calls, reply } = setup(t);
    await store.hydrate();
    reply(() => {
      if (failure === 'network') throw new Error('offline');
      return response({}, false);
    });
    store.setData('recipes', ['old']);
    store.setData('shoppingList', ['milk']);
    await store.flush();
    assert.equal(await store.refresh(), false);
    store.setData('recipes', ['new']);
    reply(() => response());
    await store.flush();
    assert.deepEqual(JSON.parse(calls.at(-1).body), { recipes: ['new'], shoppingList: ['milk'] });
  });
}

test('stale refresh cannot overwrite an edit even after the edit is saved', async (t) => {
  const { store, reply } = setup(t, { recipes: ['initial'] });
  await store.hydrate();
  const read = deferred();
  reply(() => read.promise);
  const refresh = store.refresh();
  assert.equal(store.refresh(), refresh);
  store.setData('recipes', ['local']);
  reply(() => response());
  await store.flush();
  read.resolve(response({ recipes: ['stale'] }));
  assert.equal(await refresh, false);
  assert.deepEqual(store.getData('recipes'), ['local']);
});

test('refresh handles offline, unchanged data, and remote changes', async (t) => {
  const { store, reply } = setup(t, { ingredients: ['milk'] });
  await store.hydrate();
  assert.equal(await store.refresh(), false);
  reply(() => { throw new Error('offline'); });
  assert.equal(await store.refresh(), false);
  reply(() => response({ ingredients: ['eggs'] }));
  assert.equal(await store.refresh(), true);
  assert.deepEqual(store.getData('ingredients'), ['eggs']);
});

test('legacy data is adopted only for an empty account and saved once', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const initial of [{}, { recipes: [] }]) {
    const writes = [];
    const store = createDataStore({
      request: async (_, options) => {
        if (options) writes.push(JSON.parse(options.body));
        return response(initial);
      },
      readLegacy: (key) => {
        if (key === 'ingredients') throw new Error('invalid JSON');
        return key === 'recipes' ? ['legacy'] : null;
      },
    });
    const empty = Object.keys(initial).length === 0;
    await Promise.all([store.hydrate(), store.hydrate()]);
    await store.flush();
    assert.deepEqual(store.getData('recipes'), empty ? ['legacy'] : []);
    assert.equal(writes.length, empty ? 1 : 0);
  }
});
