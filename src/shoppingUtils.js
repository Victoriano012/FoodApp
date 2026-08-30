// Shared shopping list logic used by the Recipes and Shopping List tabs.
// Recipes on the list store their per-×1 ingredients (baseIngredients) plus a
// multiplier, so the multiplier can be changed at any time and the item
// quantities adjust by the difference.

import { getData, setData } from './store';

const unitFor = (knownIngredients, name, fallback = '') => {
  const known = knownIngredients.find(i => i.name.toLowerCase() === name.toLowerCase());
  return known ? known.unit : fallback;
};

export function loadShoppingList() {
  return (getData('shoppingList') || [])
    .map(item => ({ quantity: '', unit: '', ...item }));
}

export function loadShoppingRecipes() {
  const stored = getData('shoppingRecipes') || [];
  // Migrate legacy entries that stored already-scaled ingredients
  return stored.map(r => {
    if (r.baseIngredients) return r;
    const m = r.multiplier || 1;
    return {
      ...r,
      baseIngredients: (r.ingredients || []).map(ing => {
        const qty = parseFloat(ing.quantity);
        return { ...ing, quantity: qty ? String(qty / m) : '' };
      }),
    };
  });
}

// Add (delta > 0) or subtract (delta < 0) a recipe's base ingredients,
// delta times, into the item list. Items that reach zero are removed.
function applyIngredientsToList(list, baseIngredients, delta) {
  const knownIngredients = getData('ingredients') || [];
  const updated = [...list];
  baseIngredients.forEach(ing => {
    if (!ing.name) return;
    // Ingredients marked as not auto-added (salt, pepper...) never enter or
    // leave the list through recipes
    const known = knownIngredients.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
    if (known && known.autoAdd === false) return;
    const idx = updated.findIndex(i => i.name.toLowerCase() === ing.name.toLowerCase());
    const qtyDelta = (parseFloat(ing.quantity) || 0) * delta;
    if (idx === -1) {
      if (delta > 0) {
        updated.push({
          name: ing.name,
          quantity: qtyDelta ? String(qtyDelta) : '',
          unit: unitFor(knownIngredients, ing.name, ing.unit || ''),
          checked: false,
        });
      }
    } else {
      const newQty = (parseFloat(updated[idx].quantity) || 0) + qtyDelta;
      if (delta < 0 && newQty <= 0) {
        updated.splice(idx, 1);
      } else {
        updated[idx] = {
          ...updated[idx],
          quantity: newQty ? String(newQty) : updated[idx].quantity,
          unit: unitFor(knownIngredients, updated[idx].name, updated[idx].unit),
        };
      }
    }
  });
  return updated;
}

function persist(list, recipes) {
  setData('shoppingList', list);
  setData('shoppingRecipes', recipes);
  return { list, recipes };
}

export function addRecipeToShoppingList(recipe, multiplier = 1) {
  const recipes = loadShoppingRecipes();
  if (recipes.some(r => r.name === recipe.name)) {
    return { list: loadShoppingList(), recipes };
  }
  const baseIngredients = recipe.ingredients.filter(ing => ing.name);
  const list = applyIngredientsToList(loadShoppingList(), baseIngredients, multiplier);
  return persist(list, [
    ...recipes,
    { name: recipe.name, baseIngredients, multiplier, portions: recipe.portions ?? 1 },
  ]);
}

// Change how many times a recipe is on the list. Reaching zero removes the
// recipe (and subtracts everything it contributed).
export function changeRecipeMultiplier(recipeName, delta) {
  const recipes = loadShoppingRecipes();
  const recipe = recipes.find(r => r.name === recipeName);
  if (!recipe) return { list: loadShoppingList(), recipes };
  const current = recipe.multiplier || 1;
  const next = Math.max(0, current + delta);
  const list = applyIngredientsToList(loadShoppingList(), recipe.baseIngredients, next - current);
  const updatedRecipes = next === 0
    ? recipes.filter(r => r.name !== recipeName)
    : recipes.map(r => (r.name === recipeName ? { ...r, multiplier: next } : r));
  return persist(list, updatedRecipes);
}

// Keep list entries pointing at a recipe after it is renamed
export function renameRecipeOnShoppingList(oldName, newName) {
  const recipes = loadShoppingRecipes().map(r => (r.name === oldName ? { ...r, name: newName } : r));
  setData('shoppingRecipes', recipes);
  return recipes;
}

export function removeRecipeFromShoppingList(recipeName) {
  const recipe = loadShoppingRecipes().find(r => r.name === recipeName);
  if (!recipe) return { list: loadShoppingList(), recipes: loadShoppingRecipes() };
  return changeRecipeMultiplier(recipeName, -(recipe.multiplier || 1));
}
