// Autocomplete list under a text field: the known ingredients (Ingredients
// tab) whose name starts with `typed`, minus the names in `exclude`. Renders
// nothing when there is no match. The caller decides when it is open.
export default function IngredientSuggestions({ typed, known, exclude, onPick }) {
  const lower = typed.toLowerCase();
  const used = new Set(exclude.map((name) => name.toLowerCase()));
  const matches = known.filter((i) => i.name.toLowerCase().startsWith(lower) && !used.has(i.name.toLowerCase()));
  if (matches.length === 0) return null;
  return (
    // preventDefault keeps the input focused so blur doesn't swallow the tap on a suggestion
    <div className="suggestions-dropdown" onMouseDown={(e) => e.preventDefault()}>
      {matches.map((suggestion) => (
        <div key={suggestion.name} className="suggestion-item" onClick={() => onPick(suggestion)}>
          {suggestion.name}
        </div>
      ))}
    </div>
  );
}
