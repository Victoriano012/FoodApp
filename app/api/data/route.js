import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { DATA_KEYS, getUserData, setUserData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await currentUserId();
  if (uid == null) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  try {
    return NextResponse.json(await getUserData(uid));
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
