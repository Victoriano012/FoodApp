import { useState } from 'react';
import { FiTrash2, FiShoppingCart } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { getData, setData } from '../store';
import { capitalize, cx, findByName } from '../utils';
import TabPage, { AddBar, ItemList } from './TabPage';

// First-time users start with a few ingredients
const DEFAULT_INGREDIENTS = [
  { name: 'Apples', unit: '' },
  { name: 'Bananas', unit: '' },
  { name: 'Carrots', unit: 'g' },
  { name: 'Milk', unit: 'g' },
  { name: 'Bread', unit: '' },
];

function loadIngredients() {
  const stored = getData('ingredients');
  if (stored) return stored;
  setData('ingredients', DEFAULT_INGREDIENTS);
  return DEFAULT_INGREDIENTS;
}

function Ingredients() {
  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('-');
  const [ingredients, setIngredients] = useState(loadIngredients);

  const saveIngredients = (updated) => {
    setIngredients(updated);
    setData('ingredients', updated);
  };

  const updateIngredient = (name, changes) =>
    saveIngredients(ingredients.map((ing) => (ing.name === name ? { ...ing, ...changes } : ing)));

  const handleAddIngredient = () => {
    if (!query || findByName(ingredients, query)) return;
    saveIngredients([...ingredients, { name: capitalize(query), unit: unitFilter === '-' ? '' : unitFilter }]);
    setQuery('');
    setUnitFilter('-');
  };

  // Browsing shows the manual (drag to rearrange) order; searching or
  // filtering by unit shows matches alphabetically
  const filtering = query !== '' || unitFilter !== '-';
  const filteredIngredients = filtering
    ? ingredients
        .filter((ing) => ing.name.toLowerCase().startsWith(query.toLowerCase()))
        .filter((ing) => unitFilter === '-' || ing.unit === unitFilter)
        .sort((a, b) => a.name.localeCompare(b.name))
    : ingredients;

  const { rowRef, rowProps, dragFrom } = useDragReorder(
    filtering ? 0 : ingredients.length,
    (from, to) => saveIngredients(moveItem(ingredients, from, to))
  );

  return (
    <TabPage title="Ingredients">
      <AddBar placeholder="Add or search ingredients" value={query} onChange={setQuery} onAdd={handleAddIngredient}>
        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="unit-filter">
          <option value="-">-</option>
          <option value=""> </option>
          <option value="g">g</option>
          <option value="mL">mL</option>
        </select>
      </AddBar>
      <ItemList
        total={ingredients.length}
        shown={filteredIngredients.length}
        empty="Your ingredients list is empty. Add some ingredients to get started."
        noMatch="No ingredients match your search."
      >
        {filteredIngredients.map((ingredient, idx) => (
          <li key={ingredient.name} ref={rowRef(idx)} {...rowProps(idx)} className={cx('list-row', dragFrom === idx && 'drag-row')}>
            <span>{ingredient.name}</span>
            <div className="row-actions">
              {/* autoAdd === false: skipped when a recipe is added to the shopping
                  list (salt, pepper...); undefined counts as true */}
              <FiShoppingCart
                className={cx('cart-toggle', ingredient.autoAdd === false && 'off')}
                title={ingredient.autoAdd === false
                  ? 'Not added to the shopping list with recipes'
                  : 'Added to the shopping list with recipes'}
                onClick={() => updateIngredient(ingredient.name, { autoAdd: ingredient.autoAdd === false })}
              />
              <select
                value={ingredient.unit}
                onChange={(e) => updateIngredient(ingredient.name, { unit: e.target.value })}
                className="unit-selector"
              >
                <option value=""> </option>
                <option value="g">g</option>
                <option value="mL">mL</option>
              </select>
              <FiTrash2
                className="delete-icon"
                onClick={() => saveIngredients(ingredients.filter((ing) => ing.name !== ingredient.name))}
              />
            </div>
          </li>
        ))}
      </ItemList>
    </TabPage>
  );
}

export default Ingredients;
