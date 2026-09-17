import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Gate pages behind Google sign-in. API handlers authenticate their own
// requests so data and image fetches do not decrypt the session twice.
export default auth((req) => {
  if (req.auth?.uid != null || process.env.AUTH_DEV_USER) return;
  const signIn = new URL('/api/auth/signin', req.nextUrl);
  signIn.searchParams.set('callbackUrl', req.nextUrl.href);
  return NextResponse.redirect(signIn);
});

export const config = {
  // The manifest and icons stay public so the PWA can be installed
  matcher: ['/((?!api/|_next|favicon\\.ico|manifest\\.webmanifest|.*\\.png$).*)'],
};
