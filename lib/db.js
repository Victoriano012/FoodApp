import path from 'node:path';
import { decrypt, encrypt } from './crypto.js';
import { DATA_KEYS } from '../src/dataKeys.js';

// The four collections the app persists, one encrypted JSON blob each
export { DATA_KEYS };

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
  `CREATE TABLE IF NOT EXISTS user_images (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    enc TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  )`,
];

// Cached on globalThis so dev-mode module re-evaluation reuses the connection
// (PGlite allows one instance per data dir).
const g = globalThis;

async function connect() {
  const url = process.env.DATABASE_URL;
  let q;
  let initializeSchema;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    q = (text, params = []) => sql.query(text, params);
    initializeSchema = () => sql.transaction(SCHEMA.map((s) => sql.query(s)));
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { mkdir } = await import('node:fs/promises');
    const dir = process.env.FOODAPP_PG_DIR || path.join(process.cwd(), 'data', 'pg');
    await mkdir(dir, { recursive: true });
    const pg = new PGlite(dir);
    q = async (text, params = []) => (await pg.query(text, params)).rows;
    initializeSchema = () => pg.exec(SCHEMA.join(';'));
  }
  let schema;
  return async (text, params) => {
    try {
      return await q(text, params);
    } catch (error) {
      if (error.code !== '42P01') throw error; // undefined_table
      // Existing installations need no DDL on a cold start. A new database
      // still bootstraps automatically; concurrent requests share that work.
      schema ??= initializeSchema().catch((error) => {
        schema = undefined;
        throw error;
      });
      await schema;
      return q(text, params);
    }
  };
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
  const entries = Object.entries(patch);
  if (!entries.length) return;
  const params = [];
  const values = entries.map(([key, value], index) => {
    params.push(uid, key, encrypt(uid, value));
    const offset = index * 3;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });
  // One atomic statement and network round trip for related collections.
  await q(
    `INSERT INTO user_data (user_id, key, enc) VALUES ${values.join(', ')}
     ON CONFLICT (user_id, key) DO UPDATE SET enc = EXCLUDED.enc`,
    params
  );
}

// Recipe photos live in their own rows (one JPEG each, stored as base64 inside
// the encrypted JSON) so /api/data stays small and images can be cached.
export async function putImage(uid, id, bytes) {
  await q(`INSERT INTO user_images (user_id, id, enc) VALUES ($1, $2, $3)`, [
    uid,
    id,
    encrypt(uid, Buffer.from(bytes).toString('base64')),
  ]);
}

/** JPEG bytes as a Buffer, or null when missing. */
export async function getImage(uid, id) {
  const rows = await q(`SELECT enc FROM user_images WHERE user_id = $1 AND id = $2`, [uid, id]);
  return rows.length ? Buffer.from(decrypt(uid, rows[0].enc), 'base64') : null;
}

export async function deleteImagesExcept(uid, ids) {
  await q(`DELETE FROM user_images WHERE user_id = $1 AND NOT (id = ANY($2::text[]))`, [uid, ids]);
}
