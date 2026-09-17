import { useEffect, useRef, useState } from 'react';

// Hold-and-drag reordering for the horizontal photo strip in the recipe
// editor. The held image lifts out as a "ghost" that follows the finger; a
// blank placeholder marks where it will land, and it settles there on release.
// (The vertical list version, useDragReorder, slides rows with transforms
// instead — the mechanics differ enough that sharing them wasn't simpler.)
//
// Attach itemProps(i) to every image wrapper and stripRef to the strip. While
// `ghost` is set, render the strip from `ghost.from`/`target` (see
// RecipeImages) with ghostRef on the floating copy and itemRef(j) on each slot.
export default function useImageDragReorder(images, onReorder) {
  const [ghost, setGhost] = useState(null);
  const [target, setTarget] = useState(null);
  const s = useRef({ timer: null, startX: 0, startY: 0, holding: false, scrolling: false, active: false, from: null, target: null, offsetX: 0, offsetY: 0, pointerId: null, el: null, index: null, lastClientX: 0, edgeDir: 0, raf: null });
  const ghostRef = useRef(null);
  const itemRefs = useRef([]);
  const stripRef = useRef(null);

  const startHold = (index, e) => {
    const st = s.current;
    st.el = e.currentTarget;
    st.index = index;
    st.startX = e.clientX;
    st.startY = e.clientY;
    st.pointerId = e.pointerId;
    st.holding = true;
    st.timer = setTimeout(() => startDrag(index, st.el, st.startX, st.startY), 200);
  };

  const cancelHold = () => {
    clearTimeout(s.current.timer);
    s.current.holding = false;
    s.current.scrolling = false;
  };

  const holdMoveCheck = (e) => {
    const st = s.current;
    if (st.active) return;
    // touch-action: none disables native scrolling on the images, so we pan
    // the strip ourselves when the finger moves before the hold completes
    if (st.scrolling) {
      const strip = stripRef.current;
      if (strip) strip.scrollLeft += st.lastClientX - e.clientX;
      st.lastClientX = e.clientX;
      return;
    }
    if (!st.holding) return;
    if (Math.abs(e.clientX - st.startX) > 8 || Math.abs(e.clientY - st.startY) > 8) {
      // Moved too early → it's a scroll, not a drag
      clearTimeout(st.timer);
      st.holding = false;
      st.scrolling = true;
      st.lastClientX = e.clientX;
    }
  };

  const startDrag = (index, el, clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    const st = s.current;
    st.holding = false;
    st.active = true;
    st.from = index;
    st.target = index;
    st.offsetX = clientX - rect.left;
    st.offsetY = clientY - rect.top;
    setGhost({ src: images[index], from: index, width: rect.width, height: rect.height, x: rect.left, y: rect.top });
    setTarget(index);
    try { el.setPointerCapture(st.pointerId); } catch { /* pointer may already be gone */ }
    if (navigator.vibrate) navigator.vibrate(30);

    st.lastClientX = clientX;
    st.edgeDir = 0;

    // Shift the placeholder when the finger crosses a neighbour's midpoint
    const updateTarget = (x) => {
      const rects = itemRefs.current.slice(0, images.length).map(node => node && node.getBoundingClientRect());
      for (let j = 0; j < rects.length; j++) {
        if (!rects[j] || j === st.target) continue;
        const mid = rects[j].left + rects[j].width / 2;
        if ((j < st.target && x < mid) || (j > st.target && x > mid)) {
          st.target = j;
          setTarget(j);
          break;
        }
      }
    };

    const onMove = (ev) => {
      st.lastClientX = ev.clientX;
      // The ghost tracks the finger directly (no re-render for smoothness)
      const g = ghostRef.current;
      if (g) g.style.transform = `translate(${ev.clientX - st.offsetX}px, ${ev.clientY - st.offsetY}px)`;
      // Near the strip's edge? Remember the direction for the auto-scroll loop
      const strip = stripRef.current;
      if (strip) {
        const r = strip.getBoundingClientRect();
        st.edgeDir = ev.clientX > r.right - 48 ? 1 : ev.clientX < r.left + 48 ? -1 : 0;
      }
      updateTarget(ev.clientX);
    };

    // Auto-scroll the strip while the finger holds near an edge (pointermove
    // stops firing when the finger is stationary, so this runs every frame)
    const tick = () => {
      if (!st.active) return;
      if (st.edgeDir !== 0 && stripRef.current) {
        stripRef.current.scrollLeft += st.edgeDir * 3;
        updateTarget(st.lastClientX);
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(st.raf);
      st.edgeDir = 0;
      const { from, target: to } = st;
      st.active = false;
      st.from = null;
      st.target = null;
      setGhost(null);
      setTarget(null);
      onReorder(from, to);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  // React moves the captured element in the DOM when the placeholder shifts,
  // which can drop pointer capture — re-assert it after every reorder (MDN
  // recommends re-calling setPointerCapture after DOM movements)
  useEffect(() => {
    const st = s.current;
    if (st.active && st.el) {
      try { st.el.setPointerCapture(st.pointerId); } catch { /* pointer may already be gone */ }
    }
  }, [target]);

  const itemProps = (index) => ({
    onPointerDown: (e) => startHold(index, e),
    onPointerMove: holdMoveCheck,
    onPointerUp: cancelHold,
    onPointerCancel: cancelHold,
    onContextMenu: (e) => e.preventDefault(),
  });
  const itemRef = (j) => (el) => { itemRefs.current[j] = el; };

  return { ghost, target, ghostRef, stripRef, itemRef, itemProps };
}
