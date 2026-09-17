import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { putImage } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 1.5 * 1024 * 1024;

/** Body: raw JPEG bytes (Content-Type: image/jpeg). Returns { url }. */
export async function POST(req) {
  const uid = await currentUserId();
  if (uid == null) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (req.headers.get('content-type') !== 'image/jpeg')
    return NextResponse.json({ error: 'expected image/jpeg' }, { status: 415 });
  try {
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES)
      return NextResponse.json({ error: 'image too large' }, { status: 413 });
    const id = randomUUID();
    await putImage(uid, id, bytes);
    return NextResponse.json({ url: `/api/images/${id}` });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
