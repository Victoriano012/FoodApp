
import { useState, useEffect, useRef } from 'react';
import { FiCamera, FiCheck, FiEdit3, FiImage, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import useDragReorder, { moveItem } from '../useDragReorder';
import { FaStar } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { addRecipeToShoppingList, changeRecipeMultiplier, loadShoppingRecipes, renameRecipeOnShoppingList } from '../shoppingUtils';
import { getData, setData } from '../store';
import ImageLightbox from './ImageLightbox';

function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newRecipe, setNewRecipe] = useState('');
  const [allIngredients, setAllIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIngredientIndex, setActiveIngredientIndex] = useState(null);
  const commentTextAreaRef = useRef(null);
  const ingredientInputRefs = useRef([]);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  // The open recipe is tracked by its position in the list (its name can be
  // edited); originalNameRef is null for a brand-new recipe, so an unnamed
  // one can be discarded instead of kept
  const editIndexRef = useRef(null);
  const originalNameRef = useRef(null);
  const [recipes, setRecipes] = useState(() => {
    const storedRecipes = getData('recipes');
    if (storedRecipes) {
      // Normalize recipes saved before portions/images existed
      return storedRecipes.map(r => ({ portions: 1, images: [], ...r }));
    } else {
      return [
        { name: 'Apple Pie', score: 5, portions: 4, ingredients: [{ name: 'Apples', quantity: 3, unit: '' }, { name: 'Bananas', quantity: 2, unit: '' }, { name: 'Milk', quantity: 250, unit: 'g' }], comment: 'Classic dessert.\n\n- Peel and slice the apples\n- Mix everything together\n- **Bake at 180°C for 45 min**' },
        { name: 'Carrot Soup', score: 3, portions: 2, ingredients: [{ name: 'Carrots', quantity: 500, unit: 'g' }], comment: 'Healthy and delicious' },
        { name: 'Sandwich', score: 2, portions: 1, ingredients: [{ name: 'Bread', quantity: 2, unit: '' }], comment: 'Simple and quick' }
      ];
    }
  });

  useEffect(() => {
    setData('recipes', recipes);
  }, [recipes]);

  useEffect(() => {
    const storedIngredients = getData('ingredients');
    if (storedIngredients) {
      setAllIngredients(storedIngredients);
    }
  }, []);

  useEffect(() => {
    if (commentTextAreaRef.current) {
      commentTextAreaRef.current.style.height = 'auto';
      commentTextAreaRef.current.style.height = commentTextAreaRef.current.scrollHeight + 'px';
    }
  }, [selectedRecipe, editMode]);

  const handleAddRecipe = () => {
    const name = newRecipe.trim();
    if (name && recipes.find(i => i.name.toLowerCase() === name.toLowerCase())) return;
    // With an empty bar the recipe starts blank and gets named in the popup
    const capitalizedRecipe = {
      name: name ? name.charAt(0).toUpperCase() + name.slice(1) : '',
      score: 0,
      portions: 1,
      ingredients: [],
      comment: '',
      images: []
    };
    editIndexRef.current = recipes.length;
    originalNameRef.current = null;
    setRecipes([...recipes, capitalizedRecipe]);
    setNewRecipe('');
    setSearchTerm('');
    setSelectedRecipe(capitalizedRecipe);
    setEditMode(true);
  };

  const [shoppingRecipes, setShoppingRecipes] = useState(() => loadShoppingRecipes());

  const getListMultiplier = (recipeName) =>
    shoppingRecipes.find(r => r.name === recipeName)?.multiplier || 0;

  const isRecipeInList = (recipeName) => getListMultiplier(recipeName) > 0;

  const handleAddToShoppingList = (recipe, multiplier = 1) => {
    if (!recipe || isRecipeInList(recipe.name)) return;
    const { recipes: updated } = addRecipeToShoppingList(recipe, multiplier);
    setShoppingRecipes(updated);
  };

  const handleChangeMultiplier = (recipeName, delta) => {
    const { recipes: updated } = changeRecipeMultiplier(recipeName, delta);
    setShoppingRecipes(updated);
  };

  // Browsing shows the manual (drag to rearrange) order. Searching ranks
  // recipes whose name contains the query (alphabetical) ahead of recipes
  // that only contain an ingredient matching it
  const query = searchTerm.toLowerCase();
  const byName = (a, b) => a.name.localeCompare(b.name);
  const filteredRecipes = query
    ? [
        ...recipes
          .filter(recipe => recipe.name.toLowerCase().includes(query))
          .sort(byName),
        ...recipes
          .filter(recipe =>
            !recipe.name.toLowerCase().includes(query) &&
            recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query))
          )
          .sort(byName),
      ]
    : recipes;

  // Drag-to-reorder only makes sense on the full, unfiltered list
  const { rowRef: recipeRowRef, rowProps: recipeRowProps, dragFrom: recipeDragFrom } = useDragReorder(
    query ? 0 : recipes.length,
    (from, to) => setRecipes(moveItem(recipes, from, to))
  );

  const handleRecipeClick = (recipe) => {
    editIndexRef.current = recipes.indexOf(recipe);
    originalNameRef.current = recipe.name;
    setSelectedRecipe(recipe);
    setEditMode(false);
  };

  // Any ingredient typed into a recipe that isn't in the Ingredients list yet
  // gets added there automatically
  const syncNewIngredients = (recipeIngredients) => {
    const known = new Set(allIngredients.map(i => i.name.toLowerCase()));
    const additions = [];
    recipeIngredients.forEach(ing => {
      const name = ing.name.trim();
      if (!name || known.has(name.toLowerCase())) return;
      known.add(name.toLowerCase());
      additions.push({ name: name.charAt(0).toUpperCase() + name.slice(1), unit: ing.unit || '' });
    });
    if (additions.length) {
      const updated = [...allIngredients, ...additions];
      setAllIngredients(updated);
      setData('ingredients', updated);
    }
  };

  // Leaving edit mode: tidy the recipe up and commit it. Returns false when
  // the popup must stay open (name taken), null when the recipe was discarded
  // (a brand-new one left unnamed), or the recipe that was kept.
  const finalizeEdit = () => {
    let finalRecipe = { ...selectedRecipe };
    finalRecipe.ingredients = finalRecipe.ingredients.filter(ing => !(ing.name === '' && ing.quantity === ''));
    const name = finalRecipe.name.trim();
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (name && recipes.some((r, i) => i !== editIndexRef.current && r.name.toLowerCase() === name.toLowerCase())) {
      alert(`There is already a recipe called "${capitalized}".`);
      return false;
    }
    if (!name) {
      if (originalNameRef.current === null) {
        setRecipes(recipes.filter((_, i) => i !== editIndexRef.current));
        return null;
      }
      finalRecipe.name = originalNameRef.current; // renamed to nothing: keep the old name
    } else {
      finalRecipe.name = capitalized;
    }
    if (originalNameRef.current && originalNameRef.current !== finalRecipe.name) {
      setShoppingRecipes(renameRecipeOnShoppingList(originalNameRef.current, finalRecipe.name));
    }
    originalNameRef.current = finalRecipe.name;
    handleSave(finalRecipe);
    syncNewIngredients(finalRecipe.ingredients);
    return finalRecipe;
  };

  const handleClosePopup = () => {
    if (editMode && selectedRecipe && finalizeEdit() === false) return;
    setSelectedRecipe(null);
    setEditMode(false);
  };

  const handleSave = (updatedRecipe) => {
    setSelectedRecipe(updatedRecipe);
    const updatedRecipes = recipes.map((recipe, i) =>
      i === editIndexRef.current ? updatedRecipe : recipe
    );
    setRecipes(updatedRecipes);
  };

  const handleScoreChange = (amount) => {
    const updatedRecipe = { ...selectedRecipe, score: amount };
    handleSave(updatedRecipe);
  };

  const handlePortionsChange = (delta) => {
    // 0 portions is allowed — for things that aren't portioned, like a cake
    const portions = Math.max(0, (selectedRecipe.portions ?? 1) + delta);
    handleSave({ ...selectedRecipe, portions });
  };

  // Downscale to keep the stored payload small — full phone photos would
  // blow past the API's request size limit fast
  const resizeImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleAddImages = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    try {
      const dataUrls = await Promise.all(files.map(resizeImage));
      handleSave({ ...selectedRecipe, images: [...(selectedRecipe.images || []), ...dataUrls] });
    } catch {
      alert('Could not read that image.');
    }
  };

  const handleDeleteImage = (index) => {
    const images = (selectedRecipe.images || []).filter((_, i) => i !== index);
    handleSave({ ...selectedRecipe, images });
  };

  // --- Hold-and-drag image reordering ---
  // The held image lifts out as a "ghost" that follows the finger; a blank
  // placeholder marks where it will land, and it settles there on release.
  const [dragGhost, setDragGhost] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const dragState = useRef({ timer: null, startX: 0, startY: 0, holding: false, scrolling: false, active: false, from: null, target: null, offsetX: 0, offsetY: 0, pointerId: null, el: null, index: null, lastClientX: 0, edgeDir: 0, raf: null });
  const ghostRef = useRef(null);
  const stripItemRefs = useRef([]);
  const stripRef = useRef(null);

  const startImageHold = (index, e) => {
    const s = dragState.current;
    s.el = e.currentTarget;
    s.index = index;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.pointerId = e.pointerId;
    s.holding = true;
    s.timer = setTimeout(() => startImageDrag(index, s.el, s.startX, s.startY), 200);
  };

  const cancelImageHold = () => {
    clearTimeout(dragState.current.timer);
    dragState.current.holding = false;
    dragState.current.scrolling = false;
  };

  const holdMoveCheck = (e) => {
    const s = dragState.current;
    if (s.active) return;
    // touch-action: none disables native scrolling on the images, so we pan
    // the strip ourselves when the finger moves before the hold completes
    if (s.scrolling) {
      const strip = stripRef.current;
      if (strip) strip.scrollLeft += s.lastClientX - e.clientX;
      s.lastClientX = e.clientX;
      return;
    }
    if (!s.holding) return;
    if (Math.abs(e.clientX - s.startX) > 8 || Math.abs(e.clientY - s.startY) > 8) {
      // Moved too early → it's a scroll, not a drag
      clearTimeout(s.timer);
      s.holding = false;
      s.scrolling = true;
      s.lastClientX = e.clientX;
    }
  };

  const startImageDrag = (index, el, clientX, clientY) => {
    const imgs = selectedRecipe.images || [];
    const rect = el.getBoundingClientRect();
    const s = dragState.current;
    s.holding = false;
    s.active = true;
    s.from = index;
    s.target = index;
    s.offsetX = clientX - rect.left;
    s.offsetY = clientY - rect.top;
    setDragGhost({ src: imgs[index], from: index, width: rect.width, height: rect.height, x: rect.left, y: rect.top });
    setDragTarget(index);
    try { el.setPointerCapture(s.pointerId); } catch { /* pointer may already be gone */ }
    if (navigator.vibrate) navigator.vibrate(30);

    s.lastClientX = clientX;
    s.edgeDir = 0;

    // Shift the placeholder when the finger crosses a neighbour's midpoint
    const updateTarget = (x) => {
      const rects = stripItemRefs.current.slice(0, imgs.length).map(node => node && node.getBoundingClientRect());
      for (let j = 0; j < rects.length; j++) {
        if (!rects[j] || j === s.target) continue;
        const mid = rects[j].left + rects[j].width / 2;
        if ((j < s.target && x < mid) || (j > s.target && x > mid)) {
          s.target = j;
          setDragTarget(j);
          break;
        }
      }
    };

    const onMove = (ev) => {
      s.lastClientX = ev.clientX;
      // The ghost tracks the finger directly (no re-render for smoothness)
      const g = ghostRef.current;
      if (g) g.style.transform = `translate(${ev.clientX - s.offsetX}px, ${ev.clientY - s.offsetY}px)`;
      // Near the strip's edge? Remember the direction for the auto-scroll loop
      const strip = stripRef.current;
      if (strip) {
        const r = strip.getBoundingClientRect();
        s.edgeDir = ev.clientX > r.right - 48 ? 1 : ev.clientX < r.left + 48 ? -1 : 0;
      }
      updateTarget(ev.clientX);
    };

    // Auto-scroll the strip while the finger holds near an edge (pointermove
    // stops firing when the finger is stationary, so this runs every frame)
    const tick = () => {
      if (!s.active) return;
      if (s.edgeDir !== 0 && stripRef.current) {
        stripRef.current.scrollLeft += s.edgeDir * 3;
        updateTarget(s.lastClientX);
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(s.raf);
      s.edgeDir = 0;
      const images = [...imgs];
      const [moved] = images.splice(s.from, 1);
      images.splice(s.target, 0, moved);
      s.active = false;
      s.from = null;
      s.target = null;
      setDragGhost(null);
      setDragTarget(null);
      handleSave({ ...selectedRecipe, images });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  // React moves the captured element in the DOM when the placeholder shifts,
  // which can drop pointer capture — re-assert it after every reorder (MDN
  // recommends re-calling setPointerCapture after DOM movements)
  useEffect(() => {
    const s = dragState.current;
    if (s.active && s.el) {
      try { s.el.setPointerCapture(s.pointerId); } catch { /* pointer may already be gone */ }
    }
  }, [dragTarget]);


  const handleCommentChange = (e) => {
    const updatedRecipe = { ...selectedRecipe, comment: e.target.value };
    handleSave(updatedRecipe);
  };

  const handleIngredientChange = (index, updates) => {
    const updatedIngredients = selectedRecipe.ingredients.map((ing, i) =>
      i === index ? { ...ing, ...updates } : ing
    );
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
    handleSave(updatedRecipe);
  };

  const handleAddIngredient = () => {
    const updatedIngredients = [...selectedRecipe.ingredients, { name: '', quantity: '', unit: '' }];
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
    handleSave(updatedRecipe);
  };

  const handleDeleteIngredient = (index) => {
    const updatedIngredients = selectedRecipe.ingredients.filter((_, i) => i !== index);
    const updatedRecipe = { ...selectedRecipe, ingredients: updatedIngredients };
    handleSave(updatedRecipe);
  };

  const ingredientCount = selectedRecipe ? selectedRecipe.ingredients.length : 0;
  const { rowRef, rowProps, dragFrom } = useDragReorder(ingredientCount, (from, to) => {
    handleSave({ ...selectedRecipe, ingredients: moveItem(selectedRecipe.ingredients, from, to) });
  });

  // The Ingredients tab is the source of truth for units — a recipe's stored
  // unit is only a fallback for ingredients that were deleted from there
  const unitFor = (name, fallback = '') => {
    const known = allIngredients.find(i => i.name.toLowerCase() === name.toLowerCase());
    return known ? known.unit : fallback;
  };

  const StarRating = ({ score }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          color={i <= score ? 'var(--orange)' : 'var(--star-empty)'}
          onClick={() => editMode && handleScoreChange(i)}
        />
      );
    }
    return <div className={`star-rating${editMode ? ' editable' : ''}`}>{stars}</div>;
  };


  return (
    <div className="ingredients-page">
      <h1 className="tab-header">Recipes</h1>
      <div className="content">
        <div className="ingredients-container">
          <div className="add-ingredient-bar">
            <input
              type="text"
              placeholder="Add or search recipes"
              value={newRecipe}
              onChange={(e) => {
                setNewRecipe(e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRecipe();
                }
              }}
            />
            <button onClick={handleAddRecipe}>Add</button>
          </div>
          <ul className="ingredients-list">
            {recipes.length === 0 && (
              <li className="info-message">Your recipes list is empty. Add some recipes to get started.</li>
            )}
            {filteredRecipes.length === 0 && recipes.length > 0 && (
              <li className="info-message">No recipes match your search.</li>
            )}
            {filteredRecipes.map((recipe, idx) => (
              <li
                key={recipe.name}
                ref={recipeRowRef(idx)}
                {...recipeRowProps(idx)}
                onClick={() => handleRecipeClick(recipe)}
                className={`recipe-item${recipeDragFrom === idx ? ' drag-row' : ''}`}
              >
                <span className="recipe-item-info">
                  <span>{recipe.name}</span>
                  <span className="recipe-item-meta">
                    {recipe.score > 0 && (
                      <span className="recipe-item-stars">
                        {[...Array(recipe.score)].map((_, i) => <FaStar key={i} />)}
                      </span>
                    )}
                    {(recipe.portions ?? 1) > 0 && (
                      <span>{recipe.portions ?? 1} portion{(recipe.portions ?? 1) > 1 ? 's' : ''}</span>
                    )}
                    {recipe.ingredients.length > 0 && (
                      <span>{recipe.ingredients.length} ingredient{recipe.ingredients.length > 1 ? 's' : ''}</span>
                    )}
                  </span>
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  {isRecipeInList(recipe.name) ? (
                    <div className="multiplier-control cart-stepper">
                      <button
                        className="multiplier-button"
                        onClick={() => handleChangeMultiplier(recipe.name, -1)}
                      >−</button>
                      <span className="multiplier-value cart-count">×{getListMultiplier(recipe.name)}</span>
                      <button
                        className="multiplier-button"
                        onClick={() => handleChangeMultiplier(recipe.name, 1)}
                      >+</button>
                    </div>
                  ) : (
                    <FiShoppingCart
                      className="cart-icon"
                      title="Add to shopping list"
                      onClick={() => handleAddToShoppingList(recipe)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {selectedRecipe && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleClosePopup} aria-label="Close"><FiX /></button>
            <h2 className='recipe-title'>
              {editMode ? (
                <input
                  type="text"
                  className="recipe-title-input"
                  placeholder="Recipe name"
                  value={selectedRecipe.name}
                  onChange={(e) => handleSave({ ...selectedRecipe, name: e.target.value })}
                  autoFocus={selectedRecipe.name === ''}
                />
              ) : (
                selectedRecipe.name
              )}
            </h2>
            <div className="star-portions-row">
              <StarRating score={selectedRecipe.score} />
              {!editMode && (selectedRecipe.portions ?? 1) > 0 && (
                <span className="recipe-portions-inline">
                  {selectedRecipe.portions ?? 1} portion{(selectedRecipe.portions ?? 1) > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {editMode && (
              <div className="portions-row">
                <span>Portions:</span>
                <div className="multiplier-control">
                  <button className="multiplier-button" onClick={() => handlePortionsChange(-1)}>−</button>
                  <span className="multiplier-value">{selectedRecipe.portions ?? 1}</span>
                  <button className="multiplier-button" onClick={() => handlePortionsChange(1)}>+</button>
                </div>
              </div>
            )}
            <div className="scrollable-content">
              <h3>Ingredients:</h3>
              {editMode ? (
                <>
                  {selectedRecipe.ingredients.map((ing, index) => (
                    <div
                      key={index}
                      ref={rowRef(index)}
                      {...rowProps(index)}
                      className={`ingredient-edit-row ingredient-edit-row-styled${dragFrom === index ? ' drag-row' : ''}`}
                    >
                      <input
                        type="number"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(index, { quantity: e.target.value })}
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
                            const match = allIngredients.find(i => i.name.toLowerCase() === e.target.value.toLowerCase());
                            handleIngredientChange(index, { name: e.target.value, unit: match ? match.unit : '' });
                            if (e.target.value === '') {
                              setSuggestions([]);
                              setShowSuggestions(false);
                            } else {
                              const currentIngredientNames = new Set(selectedRecipe.ingredients.map(item => item.name.toLowerCase()));
                              const filtered = allIngredients.filter(ingredient =>
                                ingredient.name.toLowerCase().startsWith(e.target.value.toLowerCase()) &&
                                !currentIngredientNames.has(ingredient.name.toLowerCase())
                              );
                              setSuggestions(filtered);
                              setShowSuggestions(true);
                            }
                          }}
                          onFocus={() => {
                            setActiveIngredientIndex(index);
                            const currentIngredientNames = new Set(selectedRecipe.ingredients.map(item => item.name.toLowerCase()));
                            const filtered = allIngredients.filter(ingredient =>
                              ingredient.name.toLowerCase().startsWith(ing.name.toLowerCase()) &&
                              !currentIngredientNames.has(ingredient.name.toLowerCase())
                            );
                            setSuggestions(filtered);
                            setShowSuggestions(true);
                          }}
                          onBlur={() => {
                            setShowSuggestions(false);
                            setActiveIngredientIndex(null);
                          }}
                          className="ingredient-name-input ingredient-name-input-styled"
                          ref={el => ingredientInputRefs.current[index] = el}
                        />
                        {showSuggestions && activeIngredientIndex === index && suggestions.length > 0 && (
                          // preventDefault keeps the input focused so blur doesn't swallow the tap on a suggestion
                          <div className="suggestions-dropdown" onMouseDown={(e) => e.preventDefault()}>
                            {suggestions.map((suggestion, sIndex) => (
                              <div
                                key={sIndex}
                                className="suggestion-item"
                                onClick={() => {
                                  handleIngredientChange(index, { name: suggestion.name, unit: suggestion.unit });
                                  setShowSuggestions(false);
                                  setActiveIngredientIndex(null);
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
                        onClick={() => handleDeleteIngredient(index)}
                      />
                    </div>
                  ))}
                  {(!selectedRecipe.ingredients.length || 
                    (selectedRecipe.ingredients[selectedRecipe.ingredients.length - 1].name !== '')) && (
                    <button onClick={handleAddIngredient} className="add-ingredient-button-styled">New Ingredient</button>
                  )}
                </>
              ) : (
                <ul>
                  {selectedRecipe.ingredients.map(ing => (
                    <li key={ing.name}>{ing.quantity}{unitFor(ing.name, ing.unit)} {ing.name}</li>
                  ))}
                </ul>
              )}
              <hr className="horizontal-line" />
              {editMode ? (
                <textarea
                  ref={commentTextAreaRef}
                  value={selectedRecipe.comment}
                  onChange={handleCommentChange}
                  className="comment-textarea"
                  rows={1}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedRecipe.comment}
                  </ReactMarkdown>
                </div>
              )}
              {editMode ? (
                <>
                  {(selectedRecipe.images || []).length > 0 && (
                    <div className="recipe-images" ref={stripRef}>
                      {dragGhost === null ? (
                        selectedRecipe.images.map((src, i) => (
                          <div
                            key={i}
                            className="recipe-image-edit"
                            onPointerDown={(e) => startImageHold(i, e)}
                            onPointerMove={holdMoveCheck}
                            onPointerUp={cancelImageHold}
                            onPointerCancel={cancelImageHold}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            <img src={src} className="recipe-image" alt={`${selectedRecipe.name} ${i + 1}`} draggable={false} />
                            <div className="image-actions">
                              <button onClick={() => handleDeleteImage(i)} aria-label="Delete image" className="image-delete">
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        (() => {
                          // Keys are the images' pre-drag indices so React MOVES the
                          // DOM nodes instead of remounting them. The pressed element
                          // must stay mounted (it morphs into the placeholder) or the
                          // browser cancels the touch's pointer stream mid-drag.
                          const items = selectedRecipe.images
                            .map((src, i) => ({ src, origIndex: i }))
                            .filter(item => item.origIndex !== dragGhost.from);
                          items.splice(dragTarget, 0, { placeholder: true, origIndex: dragGhost.from });
                          return items.map((item, j) =>
                            item.placeholder ? (
                              <div
                                key={item.origIndex}
                                ref={el => stripItemRefs.current[j] = el}
                                className="recipe-image-placeholder"
                                style={{ width: dragGhost.width, height: dragGhost.height }}
                              />
                            ) : (
                              <div
                                key={item.origIndex}
                                ref={el => stripItemRefs.current[j] = el}
                                className="recipe-image-edit"
                              >
                                <img src={item.src} className="recipe-image" alt="" draggable={false} />
                              </div>
                            )
                          );
                        })()
                      )}
                    </div>
                  )}
                  {dragGhost && (
                    <div
                      ref={ghostRef}
                      className="drag-ghost"
                      style={{
                        width: dragGhost.width,
                        height: dragGhost.height,
                        transform: `translate(${dragGhost.x}px, ${dragGhost.y}px)`
                      }}
                    >
                      <img src={dragGhost.src} alt="" draggable={false} />
                    </div>
                  )}
                  <div className="image-add-buttons">
                    <button onClick={() => galleryInputRef.current.click()}>
                      <FiImage /> Gallery
                    </button>
                    <button onClick={() => cameraInputRef.current.click()}>
                      <FiCamera /> Camera
                    </button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => { handleAddImages(e.target.files); e.target.value = ''; }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={(e) => { handleAddImages(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                </>
              ) : (
                (selectedRecipe.images || []).length > 0 && (
                  <div className="recipe-images">
                    {selectedRecipe.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        className="recipe-image"
                        alt={`${selectedRecipe.name} ${i + 1}`}
                        onClick={() => setLightboxIndex(i)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
            <div className="popup-buttons">
              <FiTrash2
                className="delete-icon"
                onClick={() => {
                  // Remove by position and skip the edit-mode save on close,
                  // which would put the recipe straight back
                  setRecipes(recipes.filter((_, i) => i !== editIndexRef.current));
                  setSelectedRecipe(null);
                  setEditMode(false);
                }}
              />
              {isRecipeInList(selectedRecipe.name) ? (
                <div className="multiplier-control cart-stepper">
                  <button
                    className="multiplier-button"
                    onClick={() => handleChangeMultiplier(selectedRecipe.name, -1)}
                  >−</button>
                  <span className="multiplier-value cart-count">×{getListMultiplier(selectedRecipe.name)}</span>
                  <button
                    className="multiplier-button"
                    onClick={() => handleChangeMultiplier(selectedRecipe.name, 1)}
                  >+</button>
                </div>
              ) : (
                <FiShoppingCart
                  className="cart-icon popup-cart"
                  title="Add to shopping list"
                  onClick={() => handleAddToShoppingList(selectedRecipe)}
                />
              )}
              {editMode ? (
                <FiCheck className="edit-icon" style={{ color: 'green' }} onClick={() => {
                  const result = finalizeEdit();
                  if (result === false) return;
                  if (result === null) setSelectedRecipe(null);
                  setEditMode(false);
                }} />
              ) : (
                <FiEdit3 className="edit-icon" onClick={() => setEditMode(true)} />
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && selectedRecipe && (
        <ImageLightbox
          images={selectedRecipe.images || []}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export default Recipes;
