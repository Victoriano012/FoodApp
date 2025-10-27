
import { useState, useEffect, useRef } from 'react';
import { FiCheck, FiEdit3, FiTrash, FiTrash2 } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newRecipe, setNewRecipe] = useState('');
  const [allIngredientNames, setAllIngredientNames] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIngredientIndex, setActiveIngredientIndex] = useState(null);
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
    const uniqueIngredientNames = Array.from(new Set(recipes.flatMap(recipe => recipe.ingredients.map(ing => ing.name))));
    setAllIngredientNames(uniqueIngredientNames);
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
    if (editMode && selectedRecipe) {
      let finalRecipe = { ...selectedRecipe };
      finalRecipe.ingredients = finalRecipe.ingredients.filter(ing => !(ing.name === '' && ing.quantity === ''));
      handleSave(finalRecipe);
    }
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

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = selectedRecipe.ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    );
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
    handleSave(updatedRecipe);
  };

  const handleAddIngredient = () => {
    const updatedIngredients = [...selectedRecipe.ingredients, { name: '', quantity: '', unit: '' }];
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
    handleSave(updatedRecipe);
  };

  const handleDeleteIngredient = (index) => {
    const updatedIngredients = selectedRecipe.ingredients.filter((_, i) => i !== index);
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
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
              {editMode ? (
                <>
                  {selectedRecipe.ingredients.map((ing, index) => (
                    <div key={index} className="ingredient-edit-row ingredient-edit-row-styled">
                      <input
                        type="number"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                        className="ingredient-quantity-input ingredient-quantity-input-styled"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        className="ingredient-unit-input ingredient-unit-input-styled"
                      >
                        <option value=""> </option>
                        <option value="g">g</option>
                      </select>
                      <div style={{ position: 'relative', flexGrow: 1 }}>
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => {
                            handleIngredientChange(index, 'name', e.target.value);
                            if (e.target.value === '') {
                              setSuggestions([]);
                              setShowSuggestions(false);
                            } else {
                              const currentIngredientNames = new Set(selectedRecipe.ingredients.map(item => item.name.toLowerCase()));
                              const filtered = allIngredientNames.filter(name =>
                                name.toLowerCase().startsWith(e.target.value.toLowerCase()) &&
                                !currentIngredientNames.has(name.toLowerCase())
                              );
                              setSuggestions(filtered);
                              setShowSuggestions(true);
                            }
                          }}
                          onFocus={() => {
                            setActiveIngredientIndex(index);
                            const currentIngredientNames = new Set(selectedRecipe.ingredients.map(item => item.name.toLowerCase()));
                            const filtered = allIngredientNames.filter(name =>
                              name.toLowerCase().startsWith(ing.name.toLowerCase()) &&
                              !currentIngredientNames.has(name.toLowerCase())
                            );
                            setSuggestions(filtered);
                            setShowSuggestions(true);
                          }}
                          onBlur={() => setTimeout(() => {
                            setShowSuggestions(false);
                            setActiveIngredientIndex(null);
                          }, 100)}
                          className="ingredient-name-input ingredient-name-input-styled"
                        />
                        {showSuggestions && activeIngredientIndex === index && suggestions.length > 0 && (
                          <div className="suggestions-dropdown">
                            {suggestions.map((suggestion, sIndex) => (
                              <div
                                key={sIndex}
                                className="suggestion-item"
                                onClick={() => {
                                  handleIngredientChange(index, 'name', suggestion);
                                  setShowSuggestions(false);
                                  setActiveIngredientIndex(null);
                                }}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FiTrash2
                        className="delete-icon ingredient-trash-icon-styled"
                        onClick={() => handleDeleteIngredient(index)}
                      />
                    </div>
                  ))}
                  {(!selectedRecipe.ingredients.length || 
                    (selectedRecipe.ingredients[selectedRecipe.ingredients.length - 1].name !== '')) && (
                    <button onClick={handleAddIngredient} className="add-ingredient-button-styled">New Ingredient</button>
                  )}
                </>
              ) : (
                <ul>
                  {selectedRecipe.ingredients.map(ing => (
                    <li key={ing.name}>{ing.quantity}{ing.unit} {ing.name}</li>
                  ))}
                </ul>
              )}
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
                    hr: ({ node, ...props }) => <hr style={{ marginTop: '1.5em', marginBottom: '-0.5em' }} {...props} />,
                    h3: ({ node, ...props }) => <h3 style={{ marginTop: '1em', marginBottom: '-0.5em' }} {...props} />,
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
                <FiCheck className="edit-icon" style={{ color: 'green' }} onClick={() => {
                  let finalRecipe = { ...selectedRecipe };
                  finalRecipe.ingredients = finalRecipe.ingredients.filter(ing => !(ing.name === '' && ing.quantity === ''));
                  handleSave(finalRecipe);
                  setEditMode(false);
                }} />
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
