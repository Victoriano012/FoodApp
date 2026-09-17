import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { findByName } from '../utils';
import IngredientSuggestions from './IngredientSuggestions';

// The recipe popup's editable ingredient rows: quantity, unit (read-only,
// follows the Ingredients tab), name with autocomplete, delete; hold a row to
// reorder. `known` is the Ingredients tab's list, `unitFor` its unit lookup.
export default function IngredientEditor({ ingredients, known, unitFor, onChange }) {
  // Index of the name field whose suggestions are open (null: none). The
  // suggestions themselves derive from that row's current text.
  const [suggestFor, setSuggestFor] = useState(null);
  const { rowRef, rowProps, dragFrom } = useDragReorder(ingredients.length, (from, to) => {
    onChange(moveItem(ingredients, from, to));
  });

  const update = (index, updates) =>
    onChange(ingredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing)));

  const last = ingredients[ingredients.length - 1];

  return (
    <>
      {ingredients.map((ing, index) => (
        <div
          key={index}
          ref={rowRef(index)}
          {...rowProps(index)}
          className={`ingredient-edit-row${dragFrom === index ? ' drag-row' : ''}`}
        >
          <input
            type="number"
            value={ing.quantity}
            onChange={(e) => update(index, { quantity: e.target.value })}
            className="ingredient-quantity-input"
          />
          <input
            type="text"
            value={unitFor(ing.name, ing.unit)}
            className="ingredient-unit-input"
            readOnly
          />
          <div className="ingredient-name-field">
            <input
              type="text"
              value={ing.name}
              onChange={(e) => {
                // Auto-fill the unit as soon as the typed name matches a known ingredient
                const match = findByName(known, e.target.value);
                update(index, { name: e.target.value, unit: match ? match.unit : '' });
                setSuggestFor(e.target.value === '' ? null : index);
              }}
              onFocus={() => setSuggestFor(index)}
              onBlur={() => setSuggestFor(null)}
              className="ingredient-name-input"
            />
            {suggestFor === index && (
              <IngredientSuggestions
                typed={ing.name}
                known={known}
                exclude={ingredients.map((i) => i.name)}
                onPick={(suggestion) => {
                  update(index, { name: suggestion.name, unit: suggestion.unit });
                  setSuggestFor(null);
                }}
              />
            )}
          </div>
          <FiTrash2
            className="delete-icon ingredient-trash-icon"
            onClick={() => onChange(ingredients.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      {(!last || last.name !== '') && (
        <button onClick={() => onChange([...ingredients, { name: '', quantity: '', unit: '' }])} className="pill-button add-ingredient-button">
          New Ingredient
        </button>
      )}
    </>
  );
}
