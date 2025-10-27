
import React, { useState, useEffect } from 'react';
import { FiTrash2 } from 'react-icons/fi';

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newRecipe, setNewRecipe] = useState('');

  useEffect(() => {
    const storedRecipes = JSON.parse(localStorage.getItem('recipes'));
    if (storedRecipes) {
      setRecipes(storedRecipes);
    } else {
      setRecipes(['Apple Pie', 'Banana Bread', 'Carrot Soup', 'Milkshake', 'Sandwich']);
      localStorage.setItem('recipes', JSON.stringify(['Apple Pie', 'Banana Bread', 'Carrot Soup', 'Milkshake', 'Sandwich']));
    }
  }, []);

  const handleAddRecipe = () => {
    if (newRecipe && !recipes.find(i => i.toLowerCase() === newRecipe.toLowerCase())) {
      const capitalizedRecipe = newRecipe.charAt(0).toUpperCase() + newRecipe.slice(1);
      const newRecipes = [...recipes, capitalizedRecipe];
      setRecipes(newRecipes);
      localStorage.setItem('recipes', JSON.stringify(newRecipes));
      setNewRecipe('');
      setSearchTerm('');
    }
  };

  const handleDeleteRecipe = (recipeName) => {
    const updatedRecipes = recipes.filter(recipe => recipe !== recipeName);
    setRecipes(updatedRecipes);
    localStorage.setItem('recipes', JSON.stringify(updatedRecipes));
  };

  const filteredRecipes = recipes
    .filter(recipe =>
      recipe.toLowerCase().startsWith(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="ingredients-page">
      <h1 className="tab-header">Recipes</h1>
      <div className="content">
        <div className="ingredients-container">
          <div className="add-ingredient-bar">
            <input
              type="text"
              placeholder="Add or search ingredients"
              value={newRecipe}
              onChange={(e) => {
                setNewRecipe(e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRecipe();
                }
              }}
            />
            <button onClick={handleAddRecipe}>Add</button>
          </div>
          <ul className="ingredients-list">
            {recipes.length === 0 && (
              <li className="info-message">Your recipes list is empty. Add some recipes to get started.</li>
            )}
            {filteredRecipes.length === 0 && recipes.length > 0 && (
              <li className="info-message">No recipes match your search.</li>
            )}
            {filteredRecipes.map(recipe => (
              <li key={recipe}>
                <span>{recipe}</span>
                <div>
                  <FiTrash2
                    className="delete-icon"
                    onClick={() => handleDeleteRecipe(recipe)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Recipes;
