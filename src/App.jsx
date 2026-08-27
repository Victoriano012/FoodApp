import { BrowserRouter as Router, Route, NavLink, Routes } from 'react-router-dom';
import { FiBookOpen, FiShoppingCart, FiList } from 'react-icons/fi';
import Recipes from './components/Recipes';
import ShoppingList from './components/ShoppingList';
import Ingredients from './components/Ingredients';
import './App.css';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="app">
        <Routes>
          <Route path="/" element={<Recipes />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/ingredients" element={<Ingredients />} />
        </Routes>
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
    </Router>
  );
}

export default App;
