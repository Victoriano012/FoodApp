'use client';

import dynamic from 'next/dynamic';

// The whole app is a client-side SPA (react-router handles the tabs, data is
// hydrated from /api/data into an in-memory store) — skip SSR entirely.
const App = dynamic(() => import('../../src/App'), { ssr: false });

export default function Page() {
  return <App />;
}
