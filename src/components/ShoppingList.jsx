import { useState, useEffect } from 'react';
import { FiTrash2, FiX } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { changeRecipeMultiplier, loadShoppingList, loadShoppingRecipes, removeRecipeFromShoppingList } from '../shoppingUtils';
import ImageLightbox from './ImageLightbox';

function ShoppingList() {
  const [viewedRecipe, setViewedRecipe] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [items, setItems] = useState(() => loadShoppingList());
  const [selectedRecipes, setSelectedRecipes] = useState(() => loadShoppingRecipes());
  const [allIngredients] = useState(() => {
    return JSON.parse(localStorage.getItem('ingredients')) || [];
  });

  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('shoppingRecipes', JSON.stringify(selectedRecipes));
  }, [selectedRecipes]);

  // The Ingredients tab is the source of truth for units
  const unitFor = (name, fallback = '') => {
    const known = allIngredients.find(i => i.name.toLowerCase() === name.toLowerCase());
    return known ? known.unit : fallback;
  };

  const handleAddItem = () => {
    const name = newItem.trim();
    if (name && !items.find(i => i.name.toLowerCase() === name.toLowerCase())) {
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      setItems([...items, {
        name: capitalized,
        quantity: newQuantity,
        unit: unitFor(name),
        checked: false
      }]);
      setNewItem('');
      setNewQuantity('');
    }
  };

  const handleToggleItem = (itemName) => {
    setItems(items.map(item =>
      item.name === itemName ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleQuantityChange = (itemName, quantity) => {
    setItems(items.map(item =>
      item.name === itemName ? { ...item, quantity } : item
    ));
  };

  const handleDeleteItem = (e, itemName) => {
    e.stopPropagation();
    setItems(items.filter(item => item.name !== itemName));
  };

  const handleRemoveRecipe = (recipeName) => {
    const { list, recipes } = removeRecipeFromShoppingList(recipeName);
    setItems(list);
    setSelectedRecipes(recipes);
  };

  const handleChangeMultiplier = (recipeName, delta) => {
    const { list, recipes } = changeRecipeMultiplier(recipeName, delta);
    setItems(list);
    setSelectedRecipes(recipes);
  };

  const handleViewRecipe = (listedRecipe) => {
    // Show the full recipe if it still exists; fall back to the stored snapshot
    const allRecipes = JSON.parse(localStorage.getItem('recipes')) || [];
    const full = allRecipes.find(r => r.name === listedRecipe.name);
    setViewedRecipe({
      ...(full || { name: listedRecipe.name, score: 0, ingredients: listedRecipe.baseIngredients, comment: '' }),
      multiplier: listedRecipe.multiplier || 1,
      portions: (full ? full.portions : listedRecipe.portions) ?? 1
    });
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="ingredients-page">
      <h1 className="tab-header">Shopping List</h1>
      <div className="content">
        <div className="ingredients-container">
          <div className="add-ingredient-bar">
            <input
              type="number"
              placeholder="Qty"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
              }}
              className="shopping-qty-add-input"
            />
            <input
              type="text"
              placeholder="Add an item to buy"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
              }}
            />
            <button onClick={handleAddItem}>Add</button>
          </div>
          <div className="ingredients-list">
            <ul>
              {items.length === 0 && (
                <li className="info-message">Your shopping list is empty. Add items you need to buy, or add a recipe from the Recipes tab.</li>
              )}
              {sortedItems.map(item => {
                const unit = unitFor(item.name, item.unit);
                return (
                  <li
                    key={item.name}
                    className={`shopping-item${item.checked ? ' checked' : ''}`}
                    onClick={() => handleToggleItem(item.name)}
                  >
                    <span className="shopping-item-label">
                      <span className="shopping-checkbox" aria-hidden="true" />
                      <span>{item.name}</span>
                    </span>
                    <div>
                      <input
                        type="number"
                        value={item.quantity}
                        placeholder="Qty"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleQuantityChange(item.name, e.target.value)}
                        className="shopping-qty-input"
                      />
                      {unit && <span className="shopping-unit">{unit}</span>}
                      <FiTrash2
                        className="delete-icon"
                        onClick={(e) => handleDeleteItem(e, item.name)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {selectedRecipes.length > 0 && (
              <div className="shopping-recipes-section">
                <h3 className="shopping-recipes-title">
                  Recipes on the list
                  <span className="shopping-recipes-total">
                    {selectedRecipes.reduce((sum, r) => sum + (r.multiplier || 1) * (r.portions ?? 1), 0)} portions
                  </span>
                </h3>
                <ul>
                  {selectedRecipes.map(recipe => (
                    <li
                      key={recipe.name}
                      className="shopping-recipe-item recipe-item"
                      onClick={() => handleViewRecipe(recipe)}
                    >
                      <span className="recipe-item-info">
                        <span>{recipe.name}</span>
                        {(recipe.portions ?? 1) > 0 && (
                          <span className="recipe-item-meta">
                            {(recipe.multiplier || 1) * (recipe.portions ?? 1)} portion{(recipe.multiplier || 1) * (recipe.portions ?? 1) > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <div className="multiplier-control">
                          <button
                            className="multiplier-button"
                            onClick={() => handleChangeMultiplier(recipe.name, -1)}
                          >−</button>
                          <span className="multiplier-value">×{recipe.multiplier || 1}</span>
                          <button
                            className="multiplier-button"
                            onClick={() => handleChangeMultiplier(recipe.name, 1)}
                          >+</button>
                        </div>
                        <FiTrash2
                          className="delete-icon"
                          onClick={() => handleRemoveRecipe(recipe.name)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewedRecipe && (
        <div className="popup-overlay" onClick={() => setViewedRecipe(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setViewedRecipe(null)} aria-label="Close"><FiX /></button>
            <h2 className="recipe-title">
              {viewedRecipe.name}
              {viewedRecipe.multiplier > 1 && (
                <span className="recipe-multiplier-badge">×{viewedRecipe.multiplier}</span>
              )}
              {viewedRecipe.portions > 0 && (
                <span className="recipe-portions-inline">
                  {viewedRecipe.portions} portion{viewedRecipe.portions > 1 ? 's' : ''}
                  {viewedRecipe.multiplier > 1 &&
                    ` · ${viewedRecipe.multiplier * viewedRecipe.portions} on the list`}
                </span>
              )}
            </h2>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(i => (
                <FaStar key={i} color={i <= viewedRecipe.score ? 'var(--orange)' : 'var(--star-empty)'} />
              ))}
            </div>
            <div className="scrollable-content">
              <h3>Ingredients:</h3>
              <ul>
                {viewedRecipe.ingredients.map(ing => (
                  <li key={ing.name}>{ing.quantity}{ing.unit} {ing.name}</li>
                ))}
              </ul>
              {viewedRecipe.comment && (
                <>
                  <hr className="horizontal-line" />
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {viewedRecipe.comment}
                    </ReactMarkdown>
                  </div>
                </>
              )}
              {(viewedRecipe.images || []).length > 0 && (
                <div className="recipe-images">
                  {viewedRecipe.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      className="recipe-image"
                      alt={`${viewedRecipe.name} ${i + 1}`}
                      onClick={() => setLightboxIndex(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && viewedRecipe && (
        <ImageLightbox
          images={viewedRecipe.images || []}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export default ShoppingList;
