import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// Keep touch animation state out of the navigation and page layout.
export default function useTabSwipe(index, tabCount, onNavigate) {
  const trackRef = useRef(null);
  const indicatorRef = useRef(null);
  const drag = useRef(null);
  const settling = useRef(false);
  const cancelSettle = useRef(null);

  useEffect(() => () => cancelSettle.current?.(), []);
  // While a drag is live, the neighbouring pages are mounted beside the
  // current one so they can slide into view
  const [showNeighbors, setShowNeighbors] = useState(false);

  // Keep the nav highlight on the active tab (animates via its CSS transition)
  useEffect(() => {
    const el = indicatorRef.current;
    if (el) el.style.transform = `translateX(${index * 100}%)`;
  }, [index]);

  const moveIndicator = (fractionalIndex, instant) => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transition = instant ? 'none' : '';
    const pos = Math.min(tabCount - 1, Math.max(0, fractionalIndex));
    el.style.transform = `translateX(${pos * 100}%)`;
  };

  // Animate the track to `transform`, then run `after` exactly once
  const settle = (transform, after) => {
    const el = trackRef.current;
    settling.current = true;
    let done = false;
    let timeout;
    const cleanup = () => {
      clearTimeout(timeout);
      el.removeEventListener('transitionend', finish);
      settling.current = false;
      cancelSettle.current = null;
    };
    const finish = (e) => {
      // Only the track's own transform transition counts — transitionend
      // events from elements inside the pages bubble up here too
      if (e && (e.target !== el || e.propertyName !== 'transform')) return;
      if (done) return;
      done = true;
      cleanup();
      after();
      // Idle again: drop the inline transform entirely so the track is no
      // longer a containing block for the fixed popups/lightbox inside it
      el.style.transition = 'none';
      el.style.transform = '';
    };
    el.addEventListener('transitionend', finish);
    cancelSettle.current = cleanup;
    timeout = setTimeout(finish, 320); // fallback in case transitionend never fires
    el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)';
    el.style.transform = transform;
  };

  const handleTouchStart = (e) => {
    drag.current = null;
    if (settling.current || e.touches.length !== 1) return;
    // Never hijack gestures inside a popup or the lightbox
    if (document.querySelector('.popup-overlay, .lightbox-overlay')) return;
    // Nor gestures starting inside a horizontally scrollable element
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 5) return;
      el = el.parentElement;
    }
    const t = e.touches[0];
    drag.current = {
      startX: t.clientX,
      startY: t.clientY,
      locked: false,
      offset: 0,
      width: 0,
      samples: [{ x: t.clientX, t: performance.now() }],
    };
  };

  const handleTouchMove = (e) => {
    const d = drag.current;
    if (!d) return;
    // A held row is being reordered — this gesture is no longer a tab swipe
    if (document.body.dataset.rowDrag) {
      drag.current = null;
      return;
    }
    const t = e.touches[0];
    const dx = t.clientX - d.startX;
    const dy = t.clientY - d.startY;
    if (!d.locked) {
      // Decide once whether this gesture is a vertical scroll or a tab drag
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      d.locked = true;
      d.width = trackRef.current.clientWidth;
      trackRef.current.style.transition = 'none';
      // Mount the neighbours synchronously: a plain setState here renders at
      // "continuous event" priority, which React may slice across frames on a
      // slow phone — meanwhile the finger keeps revealing an empty strip
      flushSync(() => setShowNeighbors(true));
    }
    // Keep a ~100ms window of positions for flick detection on release
    const now = performance.now();
    d.samples.push({ x: t.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
    // Rubber-band when there is no tab on that side
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === tabCount - 1);
    d.offset = atEdge ? dx / 3 : dx;
    trackRef.current.style.transform = `translateX(${d.offset}px)`;
    moveIndicator(index - d.offset / d.width, true);
  };

  const endDrag = (cancelled) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.locked) return;
    const dir = d.offset < 0 ? 1 : -1;
    const target = index + dir;
    const inRange = target >= 0 && target < tabCount;
    // Velocity over the last ~100ms — a finger decelerating right before
    // lift-off must not erase the flick it just made
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    // No touchmove fires while the finger rests, so samples can be stale:
    // a pause before lift-off means there is no flick, however fast the
    // finger moved earlier
    const rested = performance.now() - last.t > 80;
    const vel = !rested && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const flickDir = Math.abs(vel) > 0.35 ? (vel < 0 ? 1 : -1) : 0;
    let commit = inRange && !cancelled;
    if (commit) {
      if (flickDir === dir) commit = Math.abs(d.offset) > 25;
      else if (flickDir === -dir) commit = false; // flicked back: cancel
      else commit = Math.abs(d.offset) > d.width * 0.3;
    }
    if (commit) {
      moveIndicator(target, false);
      settle(`translateX(${-dir * d.width}px)`, () => {
        // Swap the route in synchronously while the track transform still
        // matches, so the new page is already exactly where the eye is.
        // navigate() alone is NOT flushed by the flushSync wrapper — React
        // Router defers it in a low-priority transition, which painted the
        // old page fullscreen for a few frames; its own flushSync option
        // forces the route swap to commit in this same task.
        flushSync(() => setShowNeighbors(false));
        onNavigate(target);
      });
    } else {
      moveIndicator(index, false);
      settle('translateX(0px)', () => setShowNeighbors(false));
    }
  };

  return {
    trackRef, indicatorRef, showNeighbors,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: () => endDrag(false),
      onTouchCancel: () => endDrag(true),
    },
  };
}
