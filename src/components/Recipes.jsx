
import React, { useState, useEffect } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';

const StarRating = ({ score }) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < score) {
      stars.push(<FaStar key={i} color="var(--orange)" />);
    } else {
      stars.push(<FaStar key={i} color="lightgray" />);
    }
  }
  return <div className="star-rating">{stars}</div>;
};

function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [newRecipe, setNewRecipe] = useState('');
  const [recipes, setRecipes] = useState(() => {
    const storedRecipes = JSON.parse(localStorage.getItem('recipes'));
    if (storedRecipes) {
      return storedRecipes;
    } else {
      return [
        { name: 'Apple Pie', score: 5, ingredients: [{ name: 'Apples', quantity: 3, unit: '' }, { name: 'Bananas', quantity: 2, unit: '' }, { name: 'Milk', quantity: 250, unit: 'g' }], comment: 'Classic dessert' },
        { name: 'Carrot Soup', score: 3, ingredients: [{ name: 'Carrots', quantity: 500, unit: 'g' }], comment: 'Healthy and delicious' },
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
            <h2 className='recipe-title'>{selectedRecipe.name}</h2>
            <StarRating score={selectedRecipe.score} />
            <div className="scrollable-content">
              <h3>Ingredients:</h3>
              <ul>
                {selectedRecipe.ingredients.map(ing => (
                  <li key={ing.name}>{ing.quantity}{ing.unit} {ing.name}</li>
                ))}
              </ul>
              <hr className="horizontal-line" />
              <p>{selectedRecipe.comment}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;
