import { knownIngredients, unitLookup } from '../utils';
import { IngredientList, ImageStrip, PopupFrame } from './RecipeParts';
import IngredientEditor from './IngredientEditor';
import RecipeImages from './RecipeImages';
import Markdown from './Markdown';

// The comment box grows with its content instead of scrolling
const autosize = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

// The Recipes tab's popup: read-only view of a recipe, or the editor for it.
// Every edit goes through onChange(partialRecipe); `footer` holds the tab's
// action icons.
export default function RecipePopup({ recipe, editMode, onChange, onClose, footer }) {
  const known = knownIngredients();
  const unitFor = unitLookup(known);
  return (
    <PopupFrame
      onClose={onClose}
      title={editMode ? (
        <input
          type="text"
          className="recipe-title-input"
          placeholder="Recipe name"
          value={recipe.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoFocus={recipe.name === ''}
        />
      ) : recipe.name}
      score={recipe.score}
      onScore={editMode ? (score) => onChange({ score }) : undefined}
      portions={recipe.portions}
      // 0 portions is allowed — for things that aren't portioned, like a cake
      onPortions={editMode ? (delta) => onChange({ portions: Math.max(0, recipe.portions + delta) }) : undefined}
      footer={footer}
    >
      {editMode ? (
        <>
          <IngredientEditor
            ingredients={recipe.ingredients}
            known={known}
            unitFor={unitFor}
            onChange={(ingredients) => onChange({ ingredients })}
          />
          <hr className="horizontal-line" />
          <textarea
            ref={autosize}
            value={recipe.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
            onInput={(e) => autosize(e.target)}
            className="comment-textarea"
            rows={1}
          />
          <RecipeImages images={recipe.images} name={recipe.name} onChange={(images) => onChange({ images })} />
        </>
      ) : (
        <>
          <IngredientList ingredients={recipe.ingredients} unitFor={unitFor} />
          <hr className="horizontal-line" />
          <Markdown>{recipe.comment}</Markdown>
          <ImageStrip images={recipe.images} name={recipe.name} />
        </>
      )}
    </PopupFrame>
  );
}
