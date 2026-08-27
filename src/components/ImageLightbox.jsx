import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

// Fullscreen image viewer: swipe/scroll sideways through the images,
// close with the phone's back button or by tapping outside the image.
function ImageLightbox({ images, startIndex, onClose }) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollLeft = el.clientWidth * startIndex;
  }, [startIndex]);

  // A history entry makes the phone's back button close the lightbox
  // instead of leaving the page. Push exactly once per lightbox (the ref
  // guard keeps StrictMode's double-mounted effects from push/popping and
  // instantly closing us), and never call history.back() from cleanup —
  // every close path goes through requestClose/popstate instead.
  useEffect(() => {
    if (!pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState({ lightbox: true }, '');
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Closing by tap goes through history.back() so the pushed entry is consumed
  const requestClose = () => window.history.back();

  return (
    <div className="lightbox-overlay">
      <button className="lightbox-close" onClick={requestClose} aria-label="Close">
        <FiX />
      </button>
      <div className="lightbox-strip" ref={containerRef}>
        {images.map((src, i) => (
          <div
            key={i}
            className="lightbox-slide"
            onClick={(e) => {
              if (e.target === e.currentTarget) requestClose();
            }}
          >
            <img src={src} alt={`Photo ${i + 1}`} draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageLightbox;
