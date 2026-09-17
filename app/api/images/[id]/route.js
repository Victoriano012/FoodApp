import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { getImage } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const uid = await currentUserId();
  if (uid == null) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  try {
    const bytes = await getImage(uid, (await params).id);
    if (!bytes) return NextResponse.json({ error: 'not found' }, { status: 404 });
    // Ids are random and an image's bytes never change, so cache forever
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
