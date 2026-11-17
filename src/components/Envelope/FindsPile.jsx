import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { focusLists } from '../../data/focusLists';
import { useSignedPhotoUrls } from '../../hooks/useSignedPhotoUrls';
import ItemImage from '../ItemImage';

// How many of the latest finds can be flipped through.
const MAX_FINDS = 20;
// A second click within this many ms opens the collection.
const DOUBLE_CLICK_MS = 350;
// The top print slides off the pile to the side (from wherever it is, e.g. lifted by hover), then is tucked back in
// underneath, at the back of the pile.
const PULLED_OUT = 'translate(66%, -12%) rotate(10deg)';
const SLIDE_OUT = { duration: 380, easing: 'cubic-bezier(0.33, 0, 0.2, 1)', fill: 'forwards' };
const TUCK_IN = { duration: 520, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' };

// Where a print lies, from its place in the pile (0 = top): the top two and the very back one are seen; the ones in
// between wait, hidden, under the back one.
const pilePosition = (slot, count) => {
  if (slot === 0) return 'top';
  if (slot === 1) return 'middle';
  return slot === count - 1 ? 'bottom' : 'hidden';
};
const LAYER = { top: 4, middle: 3, bottom: 2, hidden: 1 };

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const itemImage = (capture) =>
  focusLists.find((l) => l.id === capture.listId)?.items.find((i) => i.id === capture.itemId)?.image ?? null;

// A small pile of the user's latest finds as prints, lying in a corner of the desk. One click puts the top print at
// the bottom to show the next find; a double click opens the collection.
export default function FindsPile({ captures, disabled, onOpen }) {
  const latest = useMemo(
    () => [...captures].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, MAX_FINDS),
    [captures]
  );
  const { urls } = useSignedPhotoUrls(latest.map((c) => c.thumbPath).filter(Boolean));
  const [top, setTop] = useState(0);
  const printRefs = useRef([]);
  const lastClick = useRef(0);
  const sliding = useRef(false);
  if (!latest.length) return null;

  const showNext = async () => {
    if (sliding.current) return;
    sliding.current = true;
    const print = printRefs.current[top % latest.length];
    const timing = (options) => ({ ...options, duration: reducedMotion() ? 1 : options.duration });
    try {
      const out = print.animate({ transform: PULLED_OUT }, timing(SLIDE_OUT));
      await out.finished;
      // Now at the back: its resting place there is read with transitions off, so the tuck-in starts from outside.
      print.style.transition = 'none';
      flushSync(() => setTop((index) => (index + 1) % latest.length));
      out.cancel();
      const rest = getComputedStyle(print).transform;
      await print.animate({ transform: [PULLED_OUT, rest] }, timing(TUCK_IN)).finished;
    } catch {
      // Cancelled because the page closed mid-animation.
    } finally {
      print.getBoundingClientRect();
      print.style.removeProperty('transition');
      sliding.current = false;
    }
  };

  const handleClick = () => {
    const now = performance.now();
    if (now - lastClick.current < DOUBLE_CLICK_MS) {
      lastClick.current = 0;
      onOpen();
    } else {
      lastClick.current = now;
      showNext();
    }
  };

  return (
    <button
      type="button"
      className="finds-pile"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Your latest finds. Click for the next one, double-click to open your collection (${captures.length} ${captures.length === 1 ? 'find' : 'finds'}).`}
    >
      {latest.map((capture, i) => {
        const position = pilePosition((i - (top % latest.length) + latest.length) % latest.length, latest.length);
        return (
          <span
            key={capture.id}
            ref={(el) => (printRefs.current[i] = el)}
            className="finds-pile__print"
            data-position={position}
            style={{ zIndex: LAYER[position] }}
          >
            {capture.thumbPath ? (
              <span className="finds-pile__photo">
                {urls[capture.thumbPath] && <img src={urls[capture.thumbPath]} alt="" decoding="async" draggable="false" />}
              </span>
            ) : (
              <ItemImage src={itemImage(capture)} alt="" placeholder="" className="finds-pile__photo" />
            )}
          </span>
        );
      })}
    </button>
  );
}
