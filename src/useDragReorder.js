import { useLayoutEffect, useRef, useState } from 'react';

const HOLD_MS = 350;
const HOLD_SLOP = 10;

// Vertical drag-to-reorder shared by every list in the app. Hold a row for a
// beat (finger still), then move it: the row follows the finger, the other
// rows slide out of the way, and onReorder(from, to) fires on release.
// Attach rowRef(i) and rowProps(i) to each row. Moving before the hold
// elapses cancels it, so normal scrolling and taps are unaffected.
export default function useDragReorder(count, onReorder) {
  const [dragFrom, setDragFrom] = useState(null);
  const rowRefs = useRef([]);
  const s = useRef(null); // active drag
  const hold = useRef(false); // a long-press is pending
  const cleanup = useRef(null); // rows whose transforms outlive the drop

  const rowRef = (i) => (el) => { rowRefs.current[i] = el; };

  const findScroller = (el) => {
    for (let n = el; n; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 5) return n;
    }
    return null;
  };

  // The drop leaves the drag transforms in place; they only stop making sense
  // once React has re-rendered the rows in their new order, so clear them
  // after that commit but before it paints
  useLayoutEffect(() => {
    if (!cleanup.current) return;
    const rows = cleanup.current;
    cleanup.current = null;
    rows.forEach((el) => { if (el) { el.style.transition = 'none'; el.style.transform = ''; } });
    requestAnimationFrame(() => rows.forEach((el) => { if (el) el.style.transition = ''; }));
  });

  const beginDrag = (index, x, y) => {
    const rows = rowRefs.current.slice(0, count);
    if (s.current || !rows[index]) return;
    const scroller = findScroller(rows[index]);
    const scrollTop0 = scroller ? scroller.scrollTop : 0;
    // Row positions in scroll-content coordinates: they stay valid while the
    // list auto-scrolls, and all drag long, because rows only move via
    // transforms during the drag
    const slots = rows.map((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height, mid: r.top + r.height / 2 + scrollTop0 };
    });
    s.current = { from: index, target: index, startY: y, lastY: y, scroller, scrollTop0, slots, rows, edgeDir: 0, raf: null };
    // Neighbours slide out of the way smoothly; the gripped row sticks to the
    // finger. Inline so nothing animates on the post-drop re-render.
    rows.forEach((el, i) => { if (el) el.style.transition = i === index ? 'none' : 'transform 0.15s ease'; });
    setDragFrom(index);
    if (navigator.vibrate) navigator.vibrate(20);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.body.dataset.rowDrag = '1'; // tells the tab-swipe shell to stand down

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

    // The finger is dragging a row now, not scrolling, selecting, or tapping
    const blockTouch = (ev) => ev.preventDefault();
    const blockCtx = (ev) => ev.preventDefault();
    const blockClick = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener('touchmove', blockTouch, { passive: false });
    document.addEventListener('contextmenu', blockCtx);
    document.addEventListener('click', blockClick, true);

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('contextmenu', blockCtx);
      setTimeout(() => document.removeEventListener('click', blockClick, true), 100);
      delete document.body.dataset.rowDrag;
      const st = s.current;
      cancelAnimationFrame(st.raf);
      const { from, target } = st;
      cleanup.current = st.rows;
      s.current = null;
      setDragFrom(null);
      if (from !== target) onReorder(from, target);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const onPointerDown = (index) => (e) => {
    if (s.current || hold.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    hold.current = true;
    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener('pointermove', onHoldMove);
      document.removeEventListener('pointerup', cancel);
      document.removeEventListener('pointercancel', cancel);
      hold.current = false;
    };
    // Moving early means a scroll or a swipe, not a hold
    const onHoldMove = (ev) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > HOLD_SLOP) cancel();
    };
    const timer = setTimeout(() => {
      cancel();
      beginDrag(index, startX, startY);
    }, HOLD_MS);
    document.addEventListener('pointermove', onHoldMove);
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);
  };

  const rowProps = (index) => ({ onPointerDown: onPointerDown(index) });

  return { rowRef, rowProps, dragFrom };
}

// Standard move-and-reinsert used by every onReorder
export function moveItem(arr, from, to) {
  const copy = [...arr];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
