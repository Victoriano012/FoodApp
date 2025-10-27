
import React, { useState, useEffect } from 'react';
import { FiTrash2 } from 'react-icons/fi';

function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newRecipe, setNewRecipe] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipes, setRecipes] = useState(() => {
    const storedRecipes = JSON.parse(localStorage.getItem('recipes'));
    if (storedRecipes) {
      return storedRecipes;
    } else {
      return [
        { name: 'Apple Pie', score: 5, ingredients: [{ name: 'Apples', quantity: 3, unit: '' }], comment: 'Classic dessert' },
        { name: 'Banana Bread', score: 4, ingredients: [{ name: 'Bananas', quantity: 2, unit: '' }], comment: 'Easy to make' },
        { name: 'Carrot Soup', score: 3, ingredients: [{ name: 'Carrots', quantity: 500, unit: 'g' }], comment: 'Healthy and delicious' },
        { name: 'Milkshake', score: 5, ingredients: [{ name: 'Milk', quantity: 250, unit: 'g' }], comment: 'A tasty classic' },
        { name: 'Sandwich', score: 2, ingredients: [{ name: 'Bread', quantity: 2, unit: '' }], comment: 'Simple and quick' }
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  const handleAddRecipe = () => {
    if (newRecipe && !recipes.find(i => i.name.toLowerCase() === newRecipe.toLowerCase())) {
      const capitalizedRecipe = {
        name: newRecipe.charAt(0).toUpperCase() + newRecipe.slice(1),
        score: 0,
        ingredients: [],
        comment: ''
      };
      setRecipes([...recipes, capitalizedRecipe]);
      setNewRecipe('');
      setSearchTerm('');
    }
  };

  const handleDeleteRecipe = (e, recipeName) => {
    e.stopPropagation();
    const updatedRecipes = recipes.filter(recipe => recipe.name !== recipeName);
    setRecipes(updatedRecipes);
  };

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleClosePopup = () => {
    setSelectedRecipe(null);
  };

  const filteredRecipes = recipes
    .filter(recipe =>
      recipe.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

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
              <li key={recipe.name} onClick={() => handleRecipeClick(recipe)} className="recipe-item">
                <span>{recipe.name}</span>
                <div>
                  <FiTrash2
                    className="delete-icon"
                    onClick={(e) => handleDeleteRecipe(e, recipe.name)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {selectedRecipe && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleClosePopup}>X</button>
            <h2>{selectedRecipe.name}</h2>
            <p>Score: {selectedRecipe.score}/5</p>
            <h3>Ingredients:</h3>
            <ul>
              {selectedRecipe.ingredients.map(ing => (
                <li key={ing.name}>{ing.name} - {ing.quantity}{ing.unit}</li>
              ))}
            </ul>
            <h3>Comment:</h3>
            <p>{selectedRecipe.comment}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;
