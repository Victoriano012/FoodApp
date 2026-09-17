import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import { cx, plural } from '../utils';
import ImageLightbox from './ImageLightbox';

// Presentational pieces shared by the Recipes tab and the Shopping List
// (whose "recipes on the list" section and read-only popup reuse them).

// A recipe row: name with a line of meta underneath, and action controls on
// the right that don't trigger the row's own click
export function RecipeRow({ name, meta, className, children, ...rowProps }) {
  return (
    <li {...rowProps} className={cx('recipe-item', className)}>
      <span className="recipe-item-info">
        <span>{name}</span>
        {meta && <span className="recipe-item-meta">{meta}</span>}
      </span>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>{children}</div>
    </li>
  );
}

// − value + control; `value` is the rendered label (e.g. "×2" or "4")
export function MultiplierStepper({ value, onStep, className, valueClassName }) {
  return (
    <div className={cx('multiplier-control', className)}>
      <button className="multiplier-button" onClick={() => onStep(-1)}>−</button>
      <span className={cx('multiplier-value', valueClassName)}>{value}</span>
      <button className="multiplier-button" onClick={() => onStep(1)}>+</button>
    </div>
  );
}

// Five stars; clickable when onChange is given
export function StarRating({ score, onChange }) {
  return (
    <div className={cx('star-rating', onChange && 'editable')}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FaStar
          key={i}
          color={i <= score ? 'var(--orange)' : 'var(--star-empty)'}
          onClick={onChange && (() => onChange(i))}
        />
      ))}
    </div>
  );
}

// Read-only ingredient list; `unitFor` resolves the displayed unit
export function IngredientList({ ingredients, unitFor }) {
  return (
    <ul className="popup-list">
      {ingredients.map((ing) => (
        <li key={ing.name}>{ing.quantity}{unitFor(ing.name, ing.unit)} {ing.name}</li>
      ))}
    </ul>
  );
}

// Horizontal photo strip; tapping a photo opens it fullscreen
export function ImageStrip({ images = [], name }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!images.length) return null;
  return (
    <>
      <div className="recipe-images">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            className="recipe-image"
            alt={`${name} ${i + 1}`}
            onClick={() => setLightboxIndex(i)}
          />
        ))}
      </div>
      {lightboxIndex !== null && (
        <ImageLightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}

// Popup skeleton: title, stars with the portions count (or, while editing, a
// portions stepper), scrolling body, optional footer bar. `note` is extra
// text after the portions count.
export function PopupFrame({ title, score, onScore, portions, onPortions, note, footer, onClose, children }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close"><FiX /></button>
        <h2 className="recipe-title">{title}</h2>
        <div className="star-portions-row">
          <StarRating score={score} onChange={onScore} />
          {!onPortions && portions > 0 && (
            <span className="recipe-portions-inline">{plural(portions, 'portion')}{note}</span>
          )}
        </div>
        {onPortions && (
          <div className="portions-row">
            <span>Portions:</span>
            <MultiplierStepper value={portions} onStep={onPortions} />
          </div>
        )}
        <div className="scrollable-content">
          <h3>Ingredients:</h3>
          {children}
        </div>
        {footer && <div className="popup-buttons">{footer}</div>}
      </div>
    </div>
  );
}
