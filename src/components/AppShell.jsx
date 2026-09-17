import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FiBookOpen, FiShoppingCart, FiList, FiLogOut } from 'react-icons/fi';
import Recipes from './Recipes';
import ShoppingList from './ShoppingList';
import Ingredients from './Ingredients';
import useTabSwipe from '../useTabSwipe';

const TAB_ORDER = ['/', '/recipes', '/ingredients'];

function pageFor(path) {
  if (path === '/recipes') return <Recipes />;
  if (path === '/ingredients') return <Ingredients />;
  return <ShoppingList />;
}

// Swipe left/right anywhere to move between tabs: the pages follow the finger
// on a sliding track (and the nav highlight slides along), then on release
// either settle onto the neighbour tab or spring back.
export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Unmatched paths (index -1) exist only until their redirect loader
  // resolves; treat them as the default tab so the nav/swipe maths stay sane
  const index = Math.max(0, TAB_ORDER.indexOf(pathname));
  const { trackRef, indicatorRef, showNeighbors, touchHandlers } = useTabSwipe(
    index, TAB_ORDER.length, (target) => navigate(TAB_ORDER[target], { flushSync: true })
  );

  return (
    <div
      className="app"
      {...touchHandlers}
    >
      <a className="signout-link" href="/api/auth/signout" title="Sign out" aria-label="Sign out">
        <FiLogOut />
      </a>
      <div className="page-track" ref={trackRef}>
        {showNeighbors && index > 0 && (
          <div className="page-pane" style={{ left: '-100%' }}>
            {pageFor(TAB_ORDER[index - 1])}
          </div>
        )}
        <div className="page">
          <Outlet />
        </div>
        {showNeighbors && index < TAB_ORDER.length - 1 && (
          <div className="page-pane" style={{ left: '100%' }}>
            {pageFor(TAB_ORDER[index + 1])}
          </div>
        )}
      </div>
      <nav>
        <ul>
          <li className="nav-indicator" aria-hidden="true" ref={indicatorRef} />
          <li>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiShoppingCart className="nav-icon" />
              <span>Shopping</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiBookOpen className="nav-icon" />
              <span>Recipes</span>
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
