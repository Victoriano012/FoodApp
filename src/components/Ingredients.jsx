
import { useState, useEffect } from 'react';
import { FiTrash2, FiShoppingCart } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { getData, setData } from '../store';

function Ingredients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [unitFilter, setUnitFilter] = useState('-');
  const [ingredients, setIngredients] = useState(() => {
    const storedIngredients = getData('ingredients');
    if (storedIngredients) {
      return storedIngredients;
    } else {
      // Dummy data for first time users
      return [
        { name: 'Apples', unit: '' },
        { name: 'Bananas', unit: '' },
        { name: 'Carrots', unit: 'g' },
        { name: 'Milk', unit: 'g' },
        { name: 'Bread', unit: '' },
      ];
    }
  });

  useEffect(() => {
    setData('ingredients', ingredients);
  }, [ingredients]);

  const handleAddIngredient = () => {
    if (newIngredient && !ingredients.find(i => i.name.toLowerCase() === newIngredient.toLowerCase())) {
      const capitalizedIngredient = newIngredient.charAt(0).toUpperCase() + newIngredient.slice(1);
      const newUnit = unitFilter === '-' ? '' : unitFilter;
      setIngredients([...ingredients, { name: capitalizedIngredient, unit: newUnit }]);
      setNewIngredient('');
      setSearchTerm('');
      setUnitFilter('-');
    }
  };

  const handleDeleteIngredient = (ingredientName) => {
    const updatedIngredients = ingredients.filter(ingredient => ingredient.name !== ingredientName);
    setIngredients(updatedIngredients);
  };

  const handleUnitChange = (ingredientName, newUnit) => {
    const updatedIngredients = ingredients.map(ingredient =>
      ingredient.name === ingredientName ? { ...ingredient, unit: newUnit } : ingredient
    );
    setIngredients(updatedIngredients);
  };

  // autoAdd === false means the ingredient is skipped when a recipe is added
  // to the shopping list (salt, pepper...); undefined counts as true
  const handleToggleAutoAdd = (ingredientName) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.name === ingredientName
        ? { ...ingredient, autoAdd: ingredient.autoAdd === false }
        : ingredient
    ));
  };

  // Browsing shows the manual (drag to rearrange) order; searching or
  // filtering by unit shows matches alphabetically
  const filtering = searchTerm !== '' || unitFilter !== '-';
  const filteredIngredients = filtering
    ? ingredients
        .filter(ingredient =>
          ingredient.name.toLowerCase().startsWith(searchTerm.toLowerCase())
        )
        .filter(ingredient =>
          unitFilter === '-' ? true : ingredient.unit === unitFilter
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    : ingredients;

  const { rowRef, rowProps, dragFrom } = useDragReorder(
    filtering ? 0 : ingredients.length,
    (from, to) => setIngredients(moveItem(ingredients, from, to))
  );

  return (
    <div className="ingredients-page">
      <h1 className="tab-header">Ingredients</h1>
      <div className="content">
        <div className="ingredients-container">
          <div className="add-ingredient-bar">
            <input
              type="text"
              placeholder="Add or search ingredients"
              value={newIngredient}
              onChange={(e) => {
                setNewIngredient(e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddIngredient();
                }
              }}
            />
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="unit-filter"
            >
              <option value="-">-</option>
              <option value=""> </option>
              <option value="g">g</option>
              <option value="mL">mL</option>
            </select>
            <button onClick={handleAddIngredient}>Add</button>
          </div>
          <ul className="ingredients-list">
            {ingredients.length === 0 && (
              <li className="info-message">Your ingredients list is empty. Add some ingredients to get started.</li>
            )}
            {filteredIngredients.length === 0 && ingredients.length > 0 && (
              <li className="info-message">No ingredients match your search.</li>
            )}
            {filteredIngredients.map((ingredient, idx) => (
              <li
                key={ingredient.name}
                ref={rowRef(idx)}
                {...rowProps(idx)}
                className={dragFrom === idx ? 'drag-row' : ''}
              >
                <span>{ingredient.name}</span>
                <div>
                  <FiShoppingCart
                    className={`cart-toggle${ingredient.autoAdd === false ? ' off' : ''}`}
                    title={ingredient.autoAdd === false
                      ? 'Not added to the shopping list with recipes'
                      : 'Added to the shopping list with recipes'}
                    onClick={() => handleToggleAutoAdd(ingredient.name)}
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => handleUnitChange(ingredient.name, e.target.value)}
                    className="unit-selector"
                  >
                    <option value=""> </option>
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                  </select>
                  <FiTrash2
                    className="delete-icon"
                    onClick={() => handleDeleteIngredient(ingredient.name)}
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

export default Ingredients;
