import { useRef, useState } from 'react';
import { BrowserRouter as Router, Route, NavLink, Routes, useNavigate, useLocation } from 'react-router-dom';
import { FiBookOpen, FiShoppingCart, FiList } from 'react-icons/fi';
import Recipes from './components/Recipes';
import ShoppingList from './components/ShoppingList';
import Ingredients from './components/Ingredients';
import './App.css';

const TAB_ORDER = ['/', '/shopping-list', '/ingredients'];

function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const swipeStart = useRef(null);
  const [slideDir, setSlideDir] = useState(null);

  const handleTouchStart = (e) => {
    swipeStart.current = null;
    // Ignore swipes while a popup or the lightbox is open
    if (document.querySelector('.popup-overlay, .lightbox-overlay')) return;
    // Ignore swipes that start inside a horizontally scrollable element
    // (e.g. the recipe image strip) — those gestures mean "scroll", not "change tab"
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 5) return;
      el = el.parentElement;
    }
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // A deliberate horizontal swipe: long enough and clearly more sideways than vertical
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    const current = TAB_ORDER.indexOf(pathname);
    const next = current + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= TAB_ORDER.length) return;
    setSlideDir(dx < 0 ? 'left' : 'right');
    navigate(TAB_ORDER[next]);
  };

  return (
    <div className="app" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div key={pathname} className={slideDir ? `page slide-${slideDir}` : 'page'}>
        <Routes>
          <Route path="/" element={<Recipes />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/ingredients" element={<Ingredients />} />
        </Routes>
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
