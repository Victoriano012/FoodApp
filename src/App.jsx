import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter as Router, Route, NavLink, Routes, useNavigate, useLocation } from 'react-router-dom';
import { FiBookOpen, FiShoppingCart, FiList } from 'react-icons/fi';
import Recipes from './components/Recipes';
import ShoppingList from './components/ShoppingList';
import Ingredients from './components/Ingredients';
import './App.css';

const TAB_ORDER = ['/', '/shopping-list', '/ingredients'];

function pageFor(path) {
  if (path === '/shopping-list') return <ShoppingList />;
  if (path === '/ingredients') return <Ingredients />;
  return <Recipes />;
}

// Swipe left/right anywhere to move between tabs: the pages follow the finger
// on a sliding track, and on release either settle onto the neighbour tab
// (if dragged far enough or flicked) or spring back.
function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const index = TAB_ORDER.indexOf(pathname);
  const trackRef = useRef(null);
  const drag = useRef(null);
  const settling = useRef(false);
  // While a drag is live, the neighbouring pages are mounted beside the
  // current one so they can slide into view
  const [showNeighbors, setShowNeighbors] = useState(false);

  // Animate the track to `transform`, then run `after` exactly once
  const settle = (transform, after) => {
    const el = trackRef.current;
    settling.current = true;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', finish);
      settling.current = false;
      after();
    };
    el.addEventListener('transitionend', finish);
    setTimeout(finish, 300); // fallback in case transitionend never fires
    el.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1)';
    el.style.transform = transform;
  };

  const handleTouchStart = (e) => {
    drag.current = null;
    if (settling.current || e.touches.length !== 1) return;
    // Never hijack gestures inside a popup or the lightbox
    if (document.querySelector('.popup-overlay, .lightbox-overlay')) return;
    // Nor gestures starting inside a horizontally scrollable element
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 5) return;
      el = el.parentElement;
    }
    const t = e.touches[0];
    drag.current = {
      startX: t.clientX,
      startY: t.clientY,
      locked: false,
      offset: 0,
      width: 0,
      lastX: t.clientX,
      lastT: performance.now(),
      vel: 0,
    };
  };

  const handleTouchMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const t = e.touches[0];
    const dx = t.clientX - d.startX;
    const dy = t.clientY - d.startY;
    if (!d.locked) {
      // Decide once whether this gesture is a vertical scroll or a tab drag
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      d.locked = true;
      d.width = trackRef.current.clientWidth;
      trackRef.current.style.transition = 'none';
      setShowNeighbors(true);
    }
    // Blended velocity for flick detection on release
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.vel = 0.7 * ((t.clientX - d.lastX) / dt) + 0.3 * d.vel;
    d.lastX = t.clientX;
    d.lastT = now;
    // Rubber-band when there is no tab on that side
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === TAB_ORDER.length - 1);
    d.offset = atEdge ? dx / 3 : dx;
    trackRef.current.style.transform = `translateX(${d.offset}px)`;
  };

  const endDrag = (cancelled) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.locked) return;
    const dir = d.offset < 0 ? 1 : -1;
    const target = index + dir;
    const inRange = target >= 0 && target < TAB_ORDER.length;
    const farEnough = Math.abs(d.offset) > d.width * 0.35;
    const flicked = Math.abs(d.vel) > 0.4 && d.vel < 0 === (dir === 1) && Math.abs(d.offset) > 25;
    if (!cancelled && inRange && (farEnough || flicked)) {
      settle(`translateX(${-dir * d.width}px)`, () => {
        // Swap the route in synchronously, then snap the track back to 0 in
        // the same frame — the new page is already exactly where the eye is
        flushSync(() => {
          setShowNeighbors(false);
          navigate(TAB_ORDER[target]);
        });
        const el = trackRef.current;
        el.style.transition = 'none';
        el.style.transform = 'translateX(0)';
      });
    } else {
      settle('translateX(0)', () => setShowNeighbors(false));
    }
  };

  return (
    <div
      className="app"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => endDrag(false)}
      onTouchCancel={() => endDrag(true)}
    >
      <div className="page-track" ref={trackRef}>
        {showNeighbors && index > 0 && (
          <div className="page-pane" style={{ left: '-100%' }}>
            {pageFor(TAB_ORDER[index - 1])}
          </div>
        )}
        <div className="page">
          <Routes>
            <Route path="/" element={<Recipes />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/ingredients" element={<Ingredients />} />
          </Routes>
        </div>
        {showNeighbors && index < TAB_ORDER.length - 1 && (
          <div className="page-pane" style={{ left: '100%' }}>
            {pageFor(TAB_ORDER[index + 1])}
          </div>
        )}
      </div>
      <nav>
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiBookOpen className="nav-icon" />
              <span>Recipes</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/shopping-list" className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiShoppingCart className="nav-icon" />
              <span>Shopping</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/ingredients" className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiList className="nav-icon" />
              <span>Ingredients</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AppShell />
    </Router>
  );
}

export default App;
