import App from '../../src/App';

// The whole app is a client-side SPA (react-router handles the tabs, data is
// hydrated from /api/data into an in-memory store), so the HTML is the same
// loading shell for every tab: prerender it once and serve it from the CDN.
// Other paths (stale bookmarks like /shopping-list) still render on demand and
// react-router redirects them home.
export function generateStaticParams() {
  return [{ slug: [] }, { slug: ['recipes'] }, { slug: ['ingredients'] }];
}

export default function Page() {
  return <App />;
}
