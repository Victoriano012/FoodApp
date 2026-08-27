import { useRef, useState } from 'react';

// Vertical drag-to-reorder driven by a per-row grip, shared by the shopping
// list and the recipe ingredient editor. The gripped row follows the finger,
// the other rows slide out of the way, and onReorder(from, to) fires on
// release. Attach rowRef(i) to each row and handleProps(i) to its grip; the
// grip needs touch-action: none so the browser doesn't scroll instead.
export default function useDragReorder(count, onReorder) {
  const [dragFrom, setDragFrom] = useState(null);
  const rowRefs = useRef([]);
  const s = useRef(null);

  const rowRef = (i) => (el) => { rowRefs.current[i] = el; };

  const findScroller = (el) => {
    for (let n = el; n; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 5) return n;
    }
    return null;
  };

  const startDrag = (index, e) => {
    if (s.current) return;
    const rows = rowRefs.current.slice(0, count);
    if (!rows[index]) return;
    e.preventDefault();
    const scroller = findScroller(rows[index]);
    const scrollTop0 = scroller ? scroller.scrollTop : 0;
    // Row positions in scroll-content coordinates: they stay valid while the
    // list auto-scrolls, and all drag long, because rows only move via
    // transforms during the drag
    const slots = rows.map((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height, mid: r.top + r.height / 2 + scrollTop0 };
    });
    s.current = { from: index, target: index, startY: e.clientY, lastY: e.clientY, scroller, scrollTop0, slots, rows, edgeDir: 0, raf: null };
    // Neighbours slide out of the way smoothly; the gripped row sticks to the
    // finger. Inline so nothing animates on the post-drop re-render.
    rows.forEach((el, i) => { if (el) el.style.transition = i === index ? 'none' : 'transform 0.15s ease'; });
    setDragFrom(index);
    if (navigator.vibrate) navigator.vibrate(20);

    const apply = () => {
      const st = s.current;
      const scrollDelta = (st.scroller ? st.scroller.scrollTop : 0) - st.scrollTop0;
      const dy = st.lastY - st.startY + scrollDelta;
      // The row's new position is however many other rows its centre has passed
      const centre = st.slots[st.from].mid + dy;
      let target = 0;
      for (let i = 0; i < st.slots.length; i++) {
        if (i !== st.from && st.slots[i].mid < centre) target += 1;
      }
      st.target = target;
      const h = st.slots[st.from].height;
      st.rows.forEach((el, i) => {
        if (!el) return;
        if (i === st.from) el.style.transform = `translateY(${dy}px)`;
        else if (st.from < target && i > st.from && i <= target) el.style.transform = `translateY(${-h}px)`;
        else if (st.from > target && i >= target && i < st.from) el.style.transform = `translateY(${h}px)`;
        else el.style.transform = '';
      });
    };

    const onMove = (ev) => {
      const st = s.current;
      st.lastY = ev.clientY;
      if (st.scroller) {
        const r = st.scroller.getBoundingClientRect();
        st.edgeDir = ev.clientY > r.bottom - 56 ? 1 : ev.clientY < r.top + 56 ? -1 : 0;
      }
      apply();
    };

    // Keep scrolling while the finger rests near an edge (pointermove stops
    // firing when the finger is stationary, so this runs every frame)
    const tick = () => {
      const st = s.current;
      if (!st) return;
      if (st.edgeDir !== 0 && st.scroller) {
        st.scroller.scrollTop += st.edgeDir * 4;
        apply();
      }
      st.raf = requestAnimationFrame(tick);
    };
    s.current.raf = requestAnimationFrame(tick);

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      const st = s.current;
      cancelAnimationFrame(st.raf);
      // Clear transforms with transitions off so nothing animates across the
      // re-render; restore stylesheet transitions a frame later
      st.rows.forEach((el) => { if (el) { el.style.transition = 'none'; el.style.transform = ''; } });
      requestAnimationFrame(() => st.rows.forEach((el) => { if (el) el.style.transition = ''; }));
      const { from, target } = st;
      s.current = null;
      setDragFrom(null);
      if (from !== target) onReorder(from, target);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const handleProps = (index) => ({
    className: 'drag-handle',
    onPointerDown: (e) => startDrag(index, e),
  });

  return { rowRef, handleProps, dragFrom };
}

// Standard move-and-reinsert used by every onReorder
export function moveItem(arr, from, to) {
  const copy = [...arr];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
