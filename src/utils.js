import { getData, setData } from './store';

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Joins class names, skipping falsy ones: cx('row', dragging && 'drag-row')
export const cx = (...names) => names.filter(Boolean).join(' ');

// Names are unique ignoring case everywhere in the app
export const findByName = (list, name) =>
  list.find((i) => i.name.toLowerCase() === name.toLowerCase());

export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

const EMPTY_INGREDIENTS = [];
export const knownIngredients = () => getData('ingredients') || EMPTY_INGREDIENTS;

// The Ingredients tab is the source of truth for units — a recipe's stored
// unit is only a fallback for ingredients that were deleted from there.
// Returns a lookup so a render scans the ingredients once, not once per row.
export function unitLookup(ingredients = knownIngredients()) {
  const units = new Map();
  for (const i of ingredients) {
    const key = i.name.toLowerCase();
    if (!units.has(key)) units.set(key, i.unit);
  }
  return (name, fallback = '') => {
    const key = name.toLowerCase();
    return units.has(key) ? units.get(key) : fallback;
  };
}

// Anything typed into a recipe or bought from the shopping list that isn't in
// the Ingredients tab yet gets added there automatically
export function addUnknownIngredients(items) {
  const all = knownIngredients();
  const known = new Set(all.map((i) => i.name.toLowerCase()));
  const additions = [];
  for (const { name, unit = '' } of items) {
    const trimmed = name.trim();
    if (!trimmed || known.has(trimmed.toLowerCase())) continue;
    known.add(trimmed.toLowerCase());
    additions.push({ name: capitalize(trimmed), unit });
  }
  if (additions.length) setData('ingredients', [...all, ...additions]);
}
