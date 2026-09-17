'use client';

import { useEffect, useState } from 'react';
import { preload } from 'react-dom';
import { createBrowserRouter, RouterProvider, Link, redirect } from 'react-router-dom';
import AppShell from './components/AppShell';
import Recipes from './components/Recipes';
import ShoppingList from './components/ShoppingList';
import Ingredients from './components/Ingredients';
import { hydrate, flush, refresh } from './store';

function ErrorPage() {
  return (
    <div className="app-status">
      Something went wrong.
      <Link to="/" reloadDocument>Back to the app</Link>
    </div>
  );
}

const toHome = () => redirect('/');

// The data router (instead of <BrowserRouter>) is what makes
// navigate(..., { flushSync: true }) actually commit synchronously. It needs
// `window`, so it is created on first use rather than at module scope: this
// module is also evaluated on the server to prerender the loading shell.
let router;
const getRouter = () =>
  (router ??= createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <ShoppingList /> },
        { path: 'recipes', element: <Recipes /> },
        { path: 'ingredients', element: <Ingredients /> },
        // Pre-3e054f3 URL still open in PWA sessions / bookmarks
        { path: 'shopping-list', loader: toHome },
        { path: '*', loader: toHome },
      ],
    },
  ]));

// The app renders only once the user's data is hydrated from the server, so
// components keep reading it synchronously (getData) like they did localStorage
function App() {
  const [state, setState] = useState('loading');
  const [version, setVersion] = useState(0);
  // Emitted into the prerendered HTML's <head>, so the browser starts fetching
  // the data while it is still downloading the JS
  preload('/api/data', { as: 'fetch', crossOrigin: 'anonymous' });

  useEffect(() => {
    let active = true;
    hydrate().then(
      () => { if (active) setState('ready'); },
      () => { if (active) setState('error'); }
    );
    // Don't lose the last edits when the (PWA) tab is closed or backgrounded
    const onPageHide = () => flush(true);
    // Coming back to the app: pick up edits made on another device (a full
    // remount is fine — there are no unsaved edits when refresh() succeeds)
    const onVisible = async () => {
      if (document.visibilityState === 'hidden') {
        flush(true);
      } else if ((await refresh()) && active) {
        setVersion(v => v + 1);
      }
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (state === 'loading') return <div className="app-status">Loading…</div>;
  if (state === 'error') {
    return (
      <div className="app-status">
        Could not load your data.
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  return <RouterProvider key={version} router={getRouter()} />;
}

export default App;
