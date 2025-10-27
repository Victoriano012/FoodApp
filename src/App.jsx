import { BrowserRouter as Router, Route, NavLink, Routes } from 'react-router-dom';
import Recipes from './components/Recipes';
import ShoppingList from './components/ShoppingList';
import Ingredients from './components/Ingredients';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Recipes />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/ingredients" element={<Ingredients />} />
        </Routes>
        <nav>
          <ul>
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>Recipes</NavLink>
            </li>
            <li className="shopping-list-li">
              <NavLink to="/shopping-list" className={({ isActive }) => (isActive ? 'active' : '')}>Shopping List</NavLink>
            </li>
            <li>
              <NavLink to="/ingredients" className={({ isActive }) => (isActive ? 'active' : '')}>Ingredients</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </Router>
  );
}

export default App;
