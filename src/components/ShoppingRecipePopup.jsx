import { IngredientList, ImageStrip, PopupFrame } from './RecipeParts';
import Markdown from './Markdown';

export default function ShoppingRecipePopup({ recipe, unitFor, onClose }) {
  return (
    <PopupFrame
      onClose={onClose}
      title={<>
        {recipe.name}
        {recipe.multiplier > 1 && <span className="recipe-multiplier-badge">×{recipe.multiplier}</span>}
      </>}
      score={recipe.score}
      portions={recipe.portions}
      note={recipe.multiplier > 1 && ` · ${recipe.multiplier * recipe.portions} on the list`}
    >
      <IngredientList ingredients={recipe.ingredients} unitFor={unitFor} />
      {recipe.comment && (
        <>
          <hr className="horizontal-line" />
          <Markdown>{recipe.comment}</Markdown>
        </>
      )}
      <ImageStrip images={recipe.images} name={recipe.name} />
    </PopupFrame>
  );
}
