import path from 'node:path';
import { decrypt, encrypt } from './crypto';

// The four collections the app persists, one encrypted JSON blob each
export const DATA_KEYS = ['recipes', 'ingredients', 'shoppingList', 'shoppingRecipes'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    enc TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  )`,
];

// Cached on globalThis so dev-mode module re-evaluation reuses the connection
// (PGlite allows one instance per data dir).
const g = globalThis;

async function connect() {
  const url = process.env.DATABASE_URL;
  let q;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    q = (text, params = []) => sql.query(text, params);
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { mkdir } = await import('node:fs/promises');
    const dir = process.env.FOODAPP_PG_DIR || path.join(process.cwd(), 'data', 'pg');
    await mkdir(dir, { recursive: true });
    const pg = new PGlite(dir);
    q = async (text, params = []) => (await pg.query(text, params)).rows;
  }
  for (const stmt of SCHEMA) await q(stmt);
  return q;
}

function q(text, params) {
  if (!g.__foodappDb) {
    g.__foodappDb = connect();
    // A failed connection must not poison the cache for later requests
    g.__foodappDb.catch(() => { g.__foodappDb = undefined; });
  }
  return g.__foodappDb.then((fn) => fn(text, params));
}

export async function getOrCreateUser(email, name) {
  const rows = await q(
    `INSERT INTO users (email, name) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
     RETURNING id`,
    [email.toLowerCase(), name]
  );
  return rows[0].id;
}

/** All stored collections for `uid`, decrypted: { recipes?, ingredients?, ... } */
export async function getUserData(uid) {
  const rows = await q(`SELECT key, enc FROM user_data WHERE user_id = $1`, [uid]);
  const data = {};
  for (const r of rows) {
    if (DATA_KEYS.includes(r.key)) data[r.key] = decrypt(uid, r.enc);
  }
  return data;
}

/** Upsert the collections present in `patch` (already whitelisted by the route). */
export async function setUserData(uid, patch) {
  for (const [key, value] of Object.entries(patch)) {
    await q(
      `INSERT INTO user_data (user_id, key, enc) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET enc = EXCLUDED.enc`,
      [uid, key, encrypt(uid, value)]
    );
  }
}
