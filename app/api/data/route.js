import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { DATA_KEYS, deleteImagesExcept, getUserData, putImage, setUserData } from '@/lib/db';

export const dynamic = 'force-dynamic';

const IMAGE_URL = /^\/api\/images\/([^/]+)$/;

/** Ids of every stored image some recipe still references. */
function imageIds(recipes) {
  const ids = [];
  for (const r of recipes) {
    for (const src of r.images || []) {
      const m = IMAGE_URL.exec(src);
      if (m) ids.push(m[1]);
    }
  }
  return ids;
}

/** Legacy recipes embedded photos as data URLs; move those into user_images. */
async function migrateInlineImages(uid, recipes) {
  let changed = false;
  for (const r of recipes) {
    if (!r.images) continue;
    for (let i = 0; i < r.images.length; i++) {
      if (!r.images[i].startsWith('data:')) continue;
      const id = randomUUID();
      await putImage(uid, id, Buffer.from(r.images[i].slice(r.images[i].indexOf(',') + 1), 'base64'));
      r.images[i] = `/api/images/${id}`;
      changed = true;
    }
  }
  if (changed) await setUserData(uid, { recipes });
}

export async function GET() {
  const uid = await currentUserId();
  if (uid == null) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  try {
    const data = await getUserData(uid);
    if (data.recipes) await migrateInlineImages(uid, data.recipes);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req) {
  const uid = await currentUserId();
  if (uid == null) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  try {
    const body = await req.json();
    const patch = {};
    for (const key of DATA_KEYS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    await setUserData(uid, patch);
    if (patch.recipes) await deleteImagesExcept(uid, imageIds(patch.recipes));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
