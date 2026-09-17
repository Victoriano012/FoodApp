import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { findByName } from '../utils';

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

  const suggestions = ingredients[suggestFor] === undefined ? [] : (() => {
    const typed = ingredients[suggestFor].name.toLowerCase();
    const used = new Set(ingredients.map(ing => ing.name.toLowerCase()));
    return known.filter(i => i.name.toLowerCase().startsWith(typed) && !used.has(i.name.toLowerCase()));
  })();

  const last = ingredients[ingredients.length - 1];

  return (
    <>
      {ingredients.map((ing, index) => (
        <div
          key={index}
          ref={rowRef(index)}
          {...rowProps(index)}
          className={`ingredient-edit-row ingredient-edit-row-styled${dragFrom === index ? ' drag-row' : ''}`}
        >
          <input
            type="number"
            value={ing.quantity}
            onChange={(e) => update(index, { quantity: e.target.value })}
            className="ingredient-quantity-input ingredient-quantity-input-styled"
          />
          <input
            type="text"
            value={unitFor(ing.name, ing.unit)}
            className="ingredient-unit-input ingredient-unit-input-styled"
            readOnly
          />
          <div style={{ position: 'relative' }}>
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
              className="ingredient-name-input ingredient-name-input-styled"
            />
            {suggestFor === index && suggestions.length > 0 && (
              // preventDefault keeps the input focused so blur doesn't swallow the tap on a suggestion
              <div className="suggestions-dropdown" onMouseDown={(e) => e.preventDefault()}>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.name}
                    className="suggestion-item"
                    onClick={() => {
                      update(index, { name: suggestion.name, unit: suggestion.unit });
                      setSuggestFor(null);
                    }}
                  >
                    {suggestion.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <FiTrash2
            className="delete-icon ingredient-trash-icon-styled"
            onClick={() => onChange(ingredients.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      {(!last || last.name !== '') && (
        <button onClick={() => onChange([...ingredients, { name: '', quantity: '', unit: '' }])} className="add-ingredient-button-styled">
          New Ingredient
        </button>
      )}
    </>
  );
}
