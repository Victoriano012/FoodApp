import { useState, useRef } from 'react';
import { FiCheck, FiEdit3, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import useDragReorder, { moveItem } from '../useDragReorder';
import { addRecipeToShoppingList, changeRecipeMultiplier, loadShoppingRecipes, renameRecipeOnShoppingList } from '../shoppingUtils';
import { getData, setData } from '../store';
import { addUnknownIngredients, capitalize, findByName, plural } from '../utils';
import TabPage, { AddBar, ItemList } from './TabPage';
import { MultiplierStepper, RecipeRow } from './RecipeParts';
import RecipePopup from './RecipePopup';

const DEFAULT_RECIPES = [
  { name: 'Apple Pie', score: 5, portions: 4, ingredients: [{ name: 'Apples', quantity: 3, unit: '' }, { name: 'Bananas', quantity: 2, unit: '' }, { name: 'Milk', quantity: 250, unit: 'g' }], comment: 'Classic dessert.\n\n- Peel and slice the apples\n- Mix everything together\n- **Bake at 180°C for 45 min**', images: [] },
  { name: 'Carrot Soup', score: 3, portions: 2, ingredients: [{ name: 'Carrots', quantity: 500, unit: 'g' }], comment: 'Healthy and delicious', images: [] },
  { name: 'Sandwich', score: 2, portions: 1, ingredients: [{ name: 'Bread', quantity: 2, unit: '' }], comment: 'Simple and quick', images: [] },
];

// First-time users get the defaults; recipes saved before portions/images
// existed are normalised. Either way the store is written only when something
// actually changed.
function loadRecipes() {
  const stored = getData('recipes');
  if (stored && stored.every((r) => 'portions' in r && 'images' in r)) return stored;
  const recipes = stored ? stored.map((r) => ({ portions: 1, images: [], ...r })) : DEFAULT_RECIPES;
  setData('recipes', recipes);
  return recipes;
}

// Cart icon that turns into a ×N stepper once the recipe is on the shopping list
function CartControl({ multiplier, onAdd, onStep, iconClass = 'cart-icon' }) {
  return multiplier > 0 ? (
    <MultiplierStepper className="cart-stepper" valueClassName="cart-count" value={`×${multiplier}`} onStep={onStep} />
  ) : (
    <FiShoppingCart className={iconClass} title="Add to shopping list" onClick={onAdd} />
  );
}

function Recipes() {
  const [recipes, setRecipes] = useState(loadRecipes);
  const [query, setQuery] = useState('');
  // The open recipe is tracked by its position in the list (its name can be
  // edited); originalNameRef is null for a brand-new recipe, so an unnamed
  // one can be discarded instead of kept
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const originalNameRef = useRef(null);
  const [shoppingRecipes, setShoppingRecipes] = useState(loadShoppingRecipes);

  const selectedRecipe = selected === null ? null : recipes[selected];

  const saveRecipes = (updated) => {
    setRecipes(updated);
    setData('recipes', updated);
  };

  const updateSelected = (changes) =>
    saveRecipes(recipes.map((recipe, i) => (i === selected ? { ...recipe, ...changes } : recipe)));

  const closePopup = () => {
    setSelected(null);
    setEditMode(false);
  };

  const handleAddRecipe = () => {
    const name = query.trim();
    if (name && findByName(recipes, name)) return;
    // With an empty bar the recipe starts blank and gets named in the popup
    const recipe = { name: name ? capitalize(name) : '', score: 0, portions: 1, ingredients: [], comment: '', images: [] };
    originalNameRef.current = null;
    saveRecipes([...recipes, recipe]);
    setQuery('');
    setSelected(recipes.length);
    setEditMode(true);
  };

  const openRecipe = (recipe) => {
    originalNameRef.current = recipe.name;
    setSelected(recipes.indexOf(recipe));
    setEditMode(false);
  };

  const deleteSelected = () => {
    saveRecipes(recipes.filter((_, i) => i !== selected));
    closePopup();
  };

  // Leaving edit mode: tidy the recipe up and commit it. Returns false when
  // the popup must stay open (name taken); a brand-new recipe left unnamed is
  // discarded.
  const finishEdit = () => {
    const recipe = { ...selectedRecipe, ingredients: selectedRecipe.ingredients.filter((ing) => !(ing.name === '' && ing.quantity === '')) };
    const name = capitalize(recipe.name.trim());
    if (name && recipes.some((r, i) => i !== selected && r.name.toLowerCase() === name.toLowerCase())) {
      alert(`There is already a recipe called "${name}".`);
      return false;
    }
    if (!name && originalNameRef.current === null) {
      deleteSelected();
      return true;
    }
    recipe.name = name || originalNameRef.current; // renamed to nothing: keep the old name
    if (originalNameRef.current && originalNameRef.current !== recipe.name) {
      setShoppingRecipes(renameRecipeOnShoppingList(originalNameRef.current, recipe.name));
    }
    originalNameRef.current = recipe.name;
    saveRecipes(recipes.map((r, i) => (i === selected ? recipe : r)));
    addUnknownIngredients(recipe.ingredients);
    setEditMode(false);
    return true;
  };

  const handleClosePopup = () => {
    if (editMode && !finishEdit()) return;
    closePopup();
  };

  const listMultiplier = (recipeName) => shoppingRecipes.find((r) => r.name === recipeName)?.multiplier || 0;

  const handleAddToShoppingList = (recipe) => {
    if (listMultiplier(recipe.name) > 0) return;
    setShoppingRecipes(addRecipeToShoppingList(recipe).recipes);
  };

  const handleChangeMultiplier = (recipeName, delta) => {
    setShoppingRecipes(changeRecipeMultiplier(recipeName, delta).recipes);
  };

  // Browsing shows the manual (drag to rearrange) order. Searching ranks
  // recipes whose name contains the query (alphabetical) ahead of recipes
  // that only contain an ingredient matching it
  const q = query.toLowerCase();
  let filteredRecipes = recipes;
  if (q) {
    const byName = [];
    const byIngredient = [];
    for (const recipe of recipes) {
      if (recipe.name.toLowerCase().includes(q)) byName.push(recipe);
      else if (recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(q))) byIngredient.push(recipe);
    }
    const alphabetical = (a, b) => a.name.localeCompare(b.name);
    filteredRecipes = [...byName.sort(alphabetical), ...byIngredient.sort(alphabetical)];
  }

  // Drag-to-reorder only makes sense on the full, unfiltered list
  const { rowRef, rowProps, dragFrom } = useDragReorder(
    q ? 0 : recipes.length,
    (from, to) => saveRecipes(moveItem(recipes, from, to))
  );

  return (
    <>
      <TabPage title="Recipes">
        <AddBar placeholder="Add or search recipes" value={query} onChange={setQuery} onAdd={handleAddRecipe} />
        <ItemList
          total={recipes.length}
          shown={filteredRecipes.length}
          empty="Your recipes list is empty. Add some recipes to get started."
          noMatch="No recipes match your search."
        >
          {filteredRecipes.map((recipe, idx) => (
            <RecipeRow
              key={recipe.name}
              ref={rowRef(idx)}
              {...rowProps(idx)}
              className={dragFrom === idx ? 'drag-row' : undefined}
              onClick={() => openRecipe(recipe)}
              name={recipe.name}
              meta={<>
                {recipe.score > 0 && (
                  <span className="recipe-item-stars">
                    {[...Array(recipe.score)].map((_, i) => <FaStar key={i} />)}
                  </span>
                )}
                {recipe.portions > 0 && <span>{plural(recipe.portions, 'portion')}</span>}
                {recipe.ingredients.length > 0 && <span>{plural(recipe.ingredients.length, 'ingredient')}</span>}
              </>}
            >
              <CartControl
                multiplier={listMultiplier(recipe.name)}
                onAdd={() => handleAddToShoppingList(recipe)}
                onStep={(delta) => handleChangeMultiplier(recipe.name, delta)}
              />
            </RecipeRow>
          ))}
        </ItemList>
      </TabPage>

      {selectedRecipe && (
        <RecipePopup
          recipe={selectedRecipe}
          editMode={editMode}
          onChange={updateSelected}
          onClose={handleClosePopup}
          footer={<>
            <FiTrash2 className="delete-icon" onClick={deleteSelected} />
            <CartControl
              multiplier={listMultiplier(selectedRecipe.name)}
              iconClass="cart-icon popup-cart"
              onAdd={() => handleAddToShoppingList(selectedRecipe)}
              onStep={(delta) => handleChangeMultiplier(selectedRecipe.name, delta)}
            />
            {editMode ? (
              <FiCheck className="edit-icon" style={{ color: 'green' }} onClick={finishEdit} />
            ) : (
              <FiEdit3 className="edit-icon" onClick={() => setEditMode(true)} />
            )}
          </>}
        />
      )}
    </>
  );
}

export default Recipes;
