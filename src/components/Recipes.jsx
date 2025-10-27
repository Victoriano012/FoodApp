
import { useState, useEffect, useRef } from 'react';
import { FiCheck, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newRecipe, setNewRecipe] = useState('');
  const commentTextAreaRef = useRef(null);
  const [recipes, setRecipes] = useState(() => {
    const storedRecipes = JSON.parse(localStorage.getItem('recipes'));
    if (storedRecipes) {
      return storedRecipes;
    } else {
      return [
        { name: 'Apple Pie', score: 5, ingredients: [{ name: 'Apples', quantity: 3, unit: '' }, { name: 'Bananas', quantity: 2, unit: '' }, { name: 'Milk', quantity: 250, unit: 'g' }], comment: 'Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here...Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here... Classic dessert some more words should be written here...' },
        { name: 'Carrot Soup', score: 3, ingredients: [{ name: 'Carrots', quantity: 500, unit: 'g' }], comment: 'Healthy and delicious' },
        { name: 'Sandwich', score: 2, ingredients: [{ name: 'Bread', quantity: 2, unit: '' }], comment: 'Simple and quick' }
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    if (commentTextAreaRef.current) {
      commentTextAreaRef.current.style.height = 'auto';
      commentTextAreaRef.current.style.height = commentTextAreaRef.current.scrollHeight + 'px';
    }
  }, [selectedRecipe, editMode]);

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
      setSelectedRecipe(capitalizedRecipe);
      setEditMode(true);
    }
  };

  const handleDeleteRecipe = (e, recipeName) => {
    e.stopPropagation();
    const updatedRecipes = recipes.filter(recipe => recipe.name !== recipeName);
    setRecipes(updatedRecipes);
  };
  
  const filteredRecipes = recipes
    .filter(recipe =>
      recipe.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
    setEditMode(false);
  };

  const handleClosePopup = () => {
    setSelectedRecipe(null);
    setEditMode(false);
  };

  const handleSave = (updatedRecipe) => {
    setSelectedRecipe(updatedRecipe);
    const updatedRecipes = recipes.map(recipe =>
      recipe.name === updatedRecipe.name ? updatedRecipe : recipe
    );
    setRecipes(updatedRecipes);
  };

  const handleScoreChange = (amount) => {
    const updatedRecipe = { ...selectedRecipe, score: amount };
    handleSave(updatedRecipe);
  };

  const handleCommentChange = (e) => {
    const updatedRecipe = { ...selectedRecipe, comment: e.target.value };
    handleSave(updatedRecipe);
  };

  const StarRating = ({ score }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= score) {
        stars.push(<FaStar key={i} color="var(--orange)" onClick={() => editMode && handleScoreChange(i)}/>);
      } else {
        stars.push(<FaStar key={i} color="lightgray" onClick={() => editMode && handleScoreChange(i)}/>);
      }
    }
    return <div className="star-rating">{stars}</div>;
  };


  return (
    <div className="ingredients-page">
      <h1 className="tab-header">Recipes</h1>
      <div className="content">
        <div className="ingredients-container">
          <div className="add-ingredient-bar">
            <input
              type="text"
              placeholder="Add or search recipes"
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
              {editMode ? (
                <textarea
                  ref={commentTextAreaRef}
                  value={selectedRecipe.comment}
                  onChange={handleCommentChange}
                  className="comment-textarea"
                  rows={1}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    li: ({ node, ...props }) => <li style={{ marginBottom: '-0.5em' }} {...props} />,
                    p: ({ node, ...props }) => <p style={{ marginBottom: '-0.5em' }} {...props} />,
                    ul: ({ node, ...props }) => <ul style={{ marginBottom: '-0.8em', marginTop: '0.5em' }} {...props} />,
                    hr: ({ node, ...props }) => <hr style={{ marginTop: '1.5em' }} {...props} />,
                  }}
                >
                  {selectedRecipe.comment}
                </ReactMarkdown>
              )}
            </div>
            <div className="popup-buttons">
              <FiTrash2
                className="delete-icon"
                onClick={(e) => { handleDeleteRecipe(e, selectedRecipe.name); handleClosePopup(); }}
              />
              {editMode ? (
                <FiCheck className="edit-icon" style={{ color: 'green' }} onClick={() => { handleSave(selectedRecipe); setEditMode(false); }} />
              ) : (
                <FiEdit3 className="edit-icon" onClick={() => setEditMode(true)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;
