import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Never touch the developer's local data or a configured remote database.
process.env.DATABASE_URL = '';
process.env.FOODAPP_PG_DIR = await mkdtemp(path.join(tmpdir(), 'foodapp-db-test-'));
const { getOrCreateUser, getUserData, setUserData } = await import('../lib/db.js');

test('batch upserts preserve omitted collections and isolate users', async () => {
  const first = await getOrCreateUser('first@example.test', 'First');
  const second = await getOrCreateUser('second@example.test', 'Second');
  await setUserData(first, { recipes: [{ name: "Chef's pie" }], ingredients: ['apple'], shoppingList: [], shoppingRecipes: [] });
  await setUserData(second, { recipes: ['private'] });
  await setUserData(first, { recipes: ['updated'], shoppingList: ['milk'] });
  await setUserData(first, {});
  assert.deepEqual(await getUserData(first), {
    recipes: ['updated'], ingredients: ['apple'], shoppingList: ['milk'], shoppingRecipes: [],
  });
  assert.deepEqual(await getUserData(second), { recipes: ['private'] });
  // Invalid JSON values are rejected before any collection is written.
  await assert.rejects(setUserData(first, { recipes: ['must not persist'], invalid: undefined }));
  assert.deepEqual((await getUserData(first)).recipes, ['updated']);
  await rm(process.env.FOODAPP_PG_DIR, { recursive: true, force: true });
});
