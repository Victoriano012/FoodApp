import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { changeRecipeMultiplier, loadShoppingList, loadShoppingRecipes, removeRecipeFromShoppingList } from '../shoppingUtils';
import { getData, setData } from '../store';
import { addUnknownIngredients, capitalize, cx, findByName, plural, unitLookup } from '../utils';
import TabPage, { AddBar, ItemList } from './TabPage';
import { IngredientList, ImageStrip, MultiplierStepper, PopupFrame, RecipeRow } from './RecipeParts';
import Markdown from './Markdown';

function ShoppingList() {
  const [viewedRecipe, setViewedRecipe] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [items, setItems] = useState(loadShoppingList);
  const [listedRecipes, setListedRecipes] = useState(loadShoppingRecipes);
  const unitFor = unitLookup();

  const saveItems = (updated) => {
    setItems(updated);
    setData('shoppingList', updated);
  };

  const handleAddItem = () => {
    const name = newItem.trim();
    if (!name || findByName(items, name)) return;
    addUnknownIngredients([{ name }]);
    saveItems([...items, { name: capitalize(name), quantity: newQuantity, unit: unitFor(name), checked: false }]);
    setNewItem('');
    setNewQuantity('');
  };

  const updateItem = (itemName, changes) =>
    saveItems(items.map((item) => (item.name === itemName ? { ...item, ...changes } : item)));

  const handleDeleteItem = (e, itemName) => {
    e.stopPropagation();
    saveItems(items.filter((item) => item.name !== itemName));
  };

  // Both write the store themselves
  const handleRemoveRecipe = (recipeName) => {
    const { list, recipes } = removeRecipeFromShoppingList(recipeName);
    setItems(list);
    setListedRecipes(recipes);
  };

  const handleChangeMultiplier = (recipeName, delta) => {
    const { list, recipes } = changeRecipeMultiplier(recipeName, delta);
    setItems(list);
    setListedRecipes(recipes);
  };

  const handleViewRecipe = (listed) => {
    // Show the full recipe if it still exists; fall back to the stored snapshot
    const full = (getData('recipes') || []).find((r) => r.name === listed.name);
    setViewedRecipe({
      ...(full || { name: listed.name, score: 0, ingredients: listed.baseIngredients, comment: '' }),
      multiplier: listed.multiplier || 1,
      portions: (full ? full.portions : listed.portions) ?? 1,
    });
  };

  // Manual order (drag to rearrange); checked items still sink to the bottom
  const sortedItems = [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)];

  const { rowRef, rowProps, dragFrom } = useDragReorder(sortedItems.length, (from, to) => {
    saveItems(moveItem(sortedItems, from, to));
  });

  const totalPortions = listedRecipes.reduce((sum, r) => sum + (r.multiplier || 1) * (r.portions ?? 1), 0);

  return (
    <>
      <TabPage title="Shopping List">
        <AddBar placeholder="Add an item to buy" value={newItem} onChange={setNewItem} onAdd={handleAddItem}>
          <input
            type="number"
            placeholder="Qty"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
            className="shopping-qty-add-input"
          />
        </AddBar>
        <ItemList
          total={items.length}
          empty="Your shopping list is empty. Add items you need to buy, or add a recipe from the Recipes tab."
          footer={listedRecipes.length > 0 && (
            <div className="shopping-recipes-section">
              <h3 className="shopping-recipes-title">
                Recipes on the list
                <span className="shopping-recipes-total">{totalPortions} portions</span>
              </h3>
              <ul>
                {listedRecipes.map((recipe) => {
                  const portions = (recipe.multiplier || 1) * (recipe.portions ?? 1);
                  return (
                    <RecipeRow
                      key={recipe.name}
                      onClick={() => handleViewRecipe(recipe)}
                      name={recipe.name}
                      meta={(recipe.portions ?? 1) > 0 && plural(portions, 'portion')}
                    >
                      <MultiplierStepper value={`×${recipe.multiplier || 1}`} onStep={(delta) => handleChangeMultiplier(recipe.name, delta)} />
                      <FiTrash2 className="delete-icon" onClick={() => handleRemoveRecipe(recipe.name)} />
                    </RecipeRow>
                  );
                })}
              </ul>
            </div>
          )}
        >
          {sortedItems.map((item, idx) => (
            <li
              key={item.name}
              ref={rowRef(idx)}
              {...rowProps(idx)}
              className={cx('shopping-item', item.checked && 'checked', dragFrom === idx && 'drag-row')}
              onClick={() => updateItem(item.name, { checked: !item.checked })}
            >
              <span className="shopping-item-label">
                <span className="shopping-checkbox" aria-hidden="true" />
                <span>{item.name}</span>
              </span>
              <div className="row-actions">
                <input
                  type="number"
                  value={item.quantity}
                  placeholder="Qty"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateItem(item.name, { quantity: e.target.value })}
                  className="shopping-qty-input"
                />
                <span className="shopping-unit">{unitFor(item.name, item.unit)}</span>
                <FiTrash2 className="delete-icon" onClick={(e) => handleDeleteItem(e, item.name)} />
              </div>
            </li>
          ))}
        </ItemList>
      </TabPage>

      {viewedRecipe && (
        <PopupFrame
          onClose={() => setViewedRecipe(null)}
          title={<>
            {viewedRecipe.name}
            {viewedRecipe.multiplier > 1 && <span className="recipe-multiplier-badge">×{viewedRecipe.multiplier}</span>}
          </>}
          score={viewedRecipe.score}
          portions={viewedRecipe.portions}
          note={viewedRecipe.multiplier > 1 && ` · ${viewedRecipe.multiplier * viewedRecipe.portions} on the list`}
        >
          <IngredientList ingredients={viewedRecipe.ingredients} unitFor={unitFor} />
          {viewedRecipe.comment && (
            <>
              <hr className="horizontal-line" />
              <Markdown>{viewedRecipe.comment}</Markdown>
            </>
          )}
          <ImageStrip images={viewedRecipe.images} name={viewedRecipe.name} />
        </PopupFrame>
      )}
    </>
  );
}

export default ShoppingList;
