import { useRef } from 'react';
import { FiCamera, FiImage, FiTrash2 } from 'react-icons/fi';
import useImageDragReorder from '../useImageDragReorder';
import { moveItem } from '../useDragReorder';

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

// Editable photo strip: hold-and-drag to reorder, delete, add from gallery or camera
export default function RecipeImages({ images, name, onChange }) {
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { ghost, target, ghostRef, stripRef, itemRef, itemProps } = useImageDragReorder(images, (from, to) => {
    if (from !== to) onChange(moveItem(images, from, to));
  });

  const handleAddImages = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    try {
      const added = await Promise.all(files.map(resizeImage));
      onChange([...images, ...added]);
    } catch {
      alert('Could not read that image.');
    }
  };

  const onFilesPicked = (e) => { handleAddImages(e.target.files); e.target.value = ''; };

  // While dragging, keys are the images' pre-drag indices so React MOVES the
  // DOM nodes instead of remounting them. The pressed element must stay
  // mounted (it morphs into the placeholder) or the browser cancels the
  // touch's pointer stream mid-drag.
  const renderDragging = () => {
    const items = images
      .map((src, i) => ({ src, origIndex: i }))
      .filter(item => item.origIndex !== ghost.from);
    items.splice(target, 0, { placeholder: true, origIndex: ghost.from });
    return items.map((item, j) =>
      item.placeholder ? (
        <div
          key={item.origIndex}
          ref={itemRef(j)}
          className="recipe-image-placeholder"
          style={{ width: ghost.width, height: ghost.height }}
        />
      ) : (
        <div key={item.origIndex} ref={itemRef(j)} className="recipe-image-edit">
          <img src={item.src} className="recipe-image" alt="" draggable={false} />
        </div>
      )
    );
  };

  return (
    <>
      {images.length > 0 && (
        <div className="recipe-images" ref={stripRef}>
          {ghost ? renderDragging() : images.map((src, i) => (
            <div key={i} className="recipe-image-edit" {...itemProps(i)}>
              <img src={src} className="recipe-image" alt={`${name} ${i + 1}`} draggable={false} />
              <div className="image-actions">
                <button onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Delete image" className="image-delete">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ghost && (
        <div
          ref={ghostRef}
          className="drag-ghost"
          style={{ width: ghost.width, height: ghost.height, transform: `translate(${ghost.x}px, ${ghost.y}px)` }}
        >
          <img src={ghost.src} alt="" draggable={false} />
        </div>
      )}
      <div className="image-add-buttons">
        <button onClick={() => galleryInputRef.current.click()}>
          <FiImage /> Gallery
        </button>
        <button onClick={() => cameraInputRef.current.click()}>
          <FiCamera /> Camera
        </button>
        <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={onFilesPicked} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFilesPicked} />
      </div>
    </>
  );
}
