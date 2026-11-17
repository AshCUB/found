import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_DECORATIONS,
  decorationSize,
  deskDecorations,
  deskMaterials,
  isDecorationOwned,
  nextPlacementSpot,
  normalizeDeskSetup,
} from '../../data/deskDecor';
import DeskScene from './DeskScene';
import PurchasePanel from './PurchasePanel';
import './DeskDecor.css';

// How far an arrow key moves the selected decoration, as a share of the desk.
const KEY_STEP = 0.02;
// Pointer movement (px) before a press on a decoration counts as a drag rather than a tap.
const DRAG_START_DISTANCE = 3;

const categories = [...new Set(deskDecorations.map((decoration) => decoration.category))];

function useViewportSize() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const handleResize = () => setSize(read());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// Where the envelope sits on the screen (see .envelope in Envelope.css), as shares of the screen, so the preview can
// show where the letter will rest on the desk.
function envelopeArea({ width, height }) {
  const envelopeWidth = Math.min(0.7 * width, 420, 0.55 * height);
  const w = envelopeWidth / width;
  const h = (envelopeWidth * 356) / 515 / height;
  return { left: 0.5 - w / 2, top: 0.5 - h / 2, width: w, height: h };
}

// Keeps a decoration's center far enough from the desk's edges that the whole decoration stays on the desk, and
// outside the letter's area. `half` is half the decoration's size as shares of the desk ({ x, y }). If it's inside
// the letter, it's pushed out to the nearest side it fits on; if it fits on none, it goes to `fallback`.
function placeOnDesk(position, half, envelope, fallback) {
  const clampAxis = (value, h) => (h >= 0.5 ? 0.5 : Math.min(1 - h, Math.max(h, value)));
  const clamp = ({ x, y }) => ({ x: clampAxis(x, half.x), y: clampAxis(y, half.y) });
  const blocked = {
    left: envelope.left - half.x,
    right: envelope.left + envelope.width + half.x,
    top: envelope.top - half.y,
    bottom: envelope.top + envelope.height + half.y,
  };
  const overlaps = ({ x, y }) => x > blocked.left && x < blocked.right && y > blocked.top && y < blocked.bottom;
  const clamped = clamp(position);
  if (!overlaps(clamped)) return clamped;
  const candidates = [
    { ...clamped, x: blocked.left },
    { ...clamped, x: blocked.right },
    { ...clamped, y: blocked.top },
    { ...clamped, y: blocked.bottom },
  ]
    .map(clamp)
    .filter((spot) => !overlaps(spot));
  const distance = (spot) => Math.hypot(spot.x - clamped.x, spot.y - clamped.y);
  return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? fallback ?? clamped;
}

const halfSizeOf = (element, desk) => ({ x: element.offsetWidth / 2 / desk.width, y: element.offsetHeight / 2 / desk.height });

function Thumbnail({ src, fit }) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <span className="absolute inset-0 flex items-center justify-center font-body text-xs text-dark-grey">Image</span>
  ) : (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable="false"
      className={`w-full h-full ${fit === 'contain' ? 'object-contain p-xs' : 'object-cover'}`}
      onError={() => setBroken(true)}
    />
  );
}

// Picker tiles and their name labels: green when chosen/placed, black on hover or keyboard focus (even if unavailable).
const tileClass = (active) =>
  `border-2 transition-colors ${active ? 'border-green' : 'border-transparent'} group-hover:border-black group-focus-visible:border-black`;
const labelClass = (active) =>
  `block font-body text-xs mt-xs px-xs py-[2px] rounded-sm transition-colors ${
    active
      ? 'bg-green text-white group-hover:bg-black group-focus-visible:bg-black'
      : 'text-dark-grey group-hover:text-black group-focus-visible:text-black'
  }`;

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// Changes are a draft until "Save desk" is pressed; leaving without saving keeps the previously saved desk.
// Purchases are saved right away (and a bought decoration is added to the draft if there's room).
export default function DeskDecor({ deskSetup, ownedDecor = [], points, onSave, onPurchase, onClose }) {
  const saved = useMemo(() => normalizeDeskSetup(deskSetup, ownedDecor), [deskSetup, ownedDecor]);
  const [setup, setSetup] = useState(saved);
  const [saveState, setSaveState] = useState({ status: 'idle', error: null }); // idle | saving | saved | error
  // buyingId: purchase in progress; boughtId / error: result of the last purchase.
  const [purchase, setPurchase] = useState({ buyingId: null, boughtId: null, error: null });
  const [confirming, setConfirming] = useState(null); // decoration shown in the purchase panel
  const viewport = useViewportSize();
  const deskRef = useRef(null);
  const dragRef = useRef(null);

  const placedIds = new Set(setup.decorations.map((placed) => placed.id));
  const full = setup.decorations.length >= MAX_DECORATIONS;
  const envelope = envelopeArea(viewport);
  const unsaved = JSON.stringify(setup) !== JSON.stringify(saved);
  const balance = points ? points.earned - points.spent : 0;
  const bought = purchase.boughtId && deskDecorations.find((decoration) => decoration.id === purchase.boughtId);

  const change = (changes) => {
    setSetup((current) => ({ ...current, ...changes }));
    setSaveState({ status: 'idle', error: null });
    setPurchase((current) => ({ ...current, boughtId: null, error: null }));
  };

  const saveDesk = async () => {
    setSaveState({ status: 'saving', error: null });
    try {
      await onSave(setup);
      setSaveState({ status: 'saved', error: null });
    } catch (error) {
      console.error('Error saving desk:', error.cause ?? error);
      setSaveState({ status: 'error', error: error.message });
    }
  };

  const chooseMaterial = (material) => {
    if (material.id !== setup.materialId) change({ materialId: material.id });
  };

  // Adds the decoration to the draft (from the latest draft, since it also runs after a purchase finishes).
  const placeDecoration = (decoration) => {
    const desk = deskRef.current?.getBoundingClientRect();
    setSetup((current) => {
      if (current.decorations.some((placed) => placed.id === decoration.id) || current.decorations.length >= MAX_DECORATIONS) {
        return current;
      }
      let spot = nextPlacementSpot(current.decorations);
      if (desk?.width && desk?.height) {
        // Not drawn yet, so estimate its size as a square (it's sized from the desk's shorter side, see DeskScene.css).
        const side = decorationSize(decoration) * Math.min(desk.width, desk.height);
        spot = placeOnDesk(spot, { x: side / 2 / desk.width, y: side / 2 / desk.height }, envelope);
      }
      return { ...current, decorations: [...current.decorations, { id: decoration.id, ...spot }] };
    });
    setSaveState({ status: 'idle', error: null });
  };

  const addDecoration = (decoration) => {
    if (!isDecorationOwned(decoration, ownedDecor) || placedIds.has(decoration.id) || full) return;
    setPurchase((current) => ({ ...current, boughtId: null, error: null }));
    placeDecoration(decoration);
  };

  // Opens the purchase panel; buying only happens from its button.
  const openPurchase = (decoration) => {
    if (purchase.buyingId) return;
    setConfirming(decoration);
    setPurchase({ buyingId: null, boughtId: null, error: null });
  };

  const closePurchase = () => {
    if (purchase.buyingId) return;
    setConfirming(null);
    setPurchase((current) => ({ ...current, error: null }));
  };

  const buyDecoration = async (decoration) => {
    if (purchase.buyingId || balance < decoration.price) return;
    setPurchase({ buyingId: decoration.id, boughtId: null, error: null });
    try {
      await onPurchase(decoration);
      setPurchase({ buyingId: null, boughtId: decoration.id, error: null });
      setConfirming(null);
      placeDecoration(decoration);
    } catch (error) {
      console.error('Error buying decoration:', error.cause ?? error);
      setPurchase({ buyingId: null, boughtId: null, error: error.message });
    }
  };

  const removeDecoration = (id) => change({ decorations: setup.decorations.filter((placed) => placed.id !== id) });

  const moveDecoration = (id, position) =>
    change({ decorations: setup.decorations.map((placed) => (placed.id === id ? { ...placed, ...position } : placed)) });

  // Dragging moves the element directly (no re-render per frame, so it stays smooth) and updates the draft on release.
  const handlePointerDown = (event, placed) => {
    if (event.button !== 0) return;
    const element = event.currentTarget;
    const box = element.getBoundingClientRect();
    element.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: placed.id,
      element,
      startX: event.clientX,
      startY: event.clientY,
      // Where in the decoration it was grabbed, so it doesn't jump to center on the pointer.
      grabX: event.clientX - (box.left + box.width / 2),
      grabY: event.clientY - (box.top + box.height / 2),
      moved: false,
      position: { x: placed.x, y: placed.y },
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_START_DISTANCE) return;
    drag.moved = true;
    drag.element.classList.add('is-dragging');
    const desk = deskRef.current.getBoundingClientRect();
    drag.position = placeOnDesk(
      {
        x: (event.clientX - drag.grabX - desk.left) / desk.width,
        y: (event.clientY - drag.grabY - desk.top) / desk.height,
      },
      halfSizeOf(drag.element, desk),
      envelope,
      drag.position
    );
    drag.element.style.left = `${drag.position.x * 100}%`;
    drag.element.style.top = `${drag.position.y * 100}%`;
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    drag.element.classList.remove('is-dragging');
    if (drag.moved) moveDecoration(drag.id, drag.position);
  };

  const handleDecorationKey = (event, placed) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeDecoration(placed.id);
      return;
    }
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!step) return;
    event.preventDefault();
    const position = { x: placed.x + step[0] * KEY_STEP, y: placed.y + step[1] * KEY_STEP };
    const desk = deskRef.current.getBoundingClientRect();
    moveDecoration(placed.id, placeOnDesk(position, halfSizeOf(event.currentTarget, desk), envelope, placed));
  };

  const renderDecoration = (placed, decoration, image, props) => (
    <div
      {...props}
      className={`${props.className} desk-decor__item`}
      role="button"
      tabIndex={0}
      aria-label={`${decoration.name}. Drag or use the arrow keys to move it, Delete to remove it.`}
      onPointerDown={(event) => handlePointerDown(event, placed)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(event) => handleDecorationKey(event, placed)}
    >
      {image}
    </div>
  );

  return (
    <div className="min-h-screen bg-grey animate-fade-in pb-lg">
      {/* Header */}
      <div className="p-lg pb-md max-w-md mx-auto">
        <button
          onClick={onClose}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Back
        </button>

        <div className="flex items-center justify-between gap-md mb-xs">
          <h1 className="font-primary text-3xl text-green">Your Desk</h1>
          <p className="font-buttons text-sm text-white bg-green rounded-full px-md py-xs whitespace-nowrap" aria-live="polite">
            {balance} {balance === 1 ? 'point' : 'points'}
          </p>
        </div>
        <p className="font-body text-xs text-dark-grey">
          Your letters arrive here. Drag decorations to arrange them. Every find you add to your collection earns a point
          to spend on new decorations.
        </p>
      </div>

      {/* Preview: shaped like the screen, so decorations sit where they will behind the envelope */}
      <div className="px-lg mb-lg max-w-md mx-auto">
        <DeskScene
          setup={setup}
          deskRef={deskRef}
          className="desk-decor__preview rounded-lg shadow-sm mx-auto"
          style={{ '--viewport-ratio': viewport.width / viewport.height }}
          renderDecoration={renderDecoration}
        >
          <div
            className="desk-decor__envelope"
            aria-hidden="true"
            style={{
              left: `${envelope.left * 100}%`,
              top: `${envelope.top * 100}%`,
              width: `${envelope.width * 100}%`,
              height: `${envelope.height * 100}%`,
            }}
          >
            <span className="font-body">your letter</span>
          </div>
        </DeskScene>
      </div>

      <div className="px-lg max-w-md mx-auto space-y-lg">
        {/* Desk material */}
        <section className="bg-white p-md rounded-lg shadow-sm">
          <h2 className="font-buttons text-sm text-black mb-md">Desk</h2>
          <div className="grid grid-cols-3 gap-sm" role="radiogroup" aria-label="Desk material">
            {deskMaterials.map((material) => {
              const selected = material.id === setup.materialId;
              return (
                <button
                  key={material.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseMaterial(material)}
                  className="group text-left"
                >
                  <span className={`block relative aspect-[3/4] rounded-md overflow-hidden bg-grey ${tileClass(selected)}`}>
                    <Thumbnail src={material.image} fit="cover" />
                  </span>
                  <span className={labelClass(selected)}>{material.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Decorations */}
        <section className="bg-white p-md rounded-lg shadow-sm">
          <div className="flex items-baseline justify-between mb-xs">
            <h2 className="font-buttons text-sm text-black">Decorations</h2>
            <p className="font-body text-xs text-dark-grey">
              {setup.decorations.length} of {MAX_DECORATIONS} placed
            </p>
          </div>
          <p className="font-body text-xs mb-md text-dark-grey" aria-live="polite">
            {bought
              ? placedIds.has(bought.id)
                ? `${bought.name} is yours and on your desk. Save to keep it there.`
                : `${bought.name} is yours. Remove a decoration to make room for it.`
              : full
                ? 'Your desk is full. Remove a decoration to add another.'
                : 'Tap a decoration to add or remove it, or to buy it with your points.'}
          </p>

          {categories.map((category) => (
            <div key={category} className="mb-md last:mb-0">
              <h3 className="font-body text-xs text-dark-grey mb-sm">{category}</h3>
              <div className="grid grid-cols-3 gap-sm">
                {deskDecorations
                  .filter((decoration) => decoration.category === category)
                  .map((decoration) => {
                    const placed = placedIds.has(decoration.id);
                    const owned = isDecorationOwned(decoration, ownedDecor);
                    const buying = purchase.buyingId === decoration.id;
                    const unavailable = owned
                      ? !placed && full
                      : !!purchase.buyingId;
                    return (
                      // aria-disabled rather than disabled, so unavailable items still show hover (the handlers ignore them).
                      <button
                        key={decoration.id}
                        type="button"
                        aria-pressed={owned ? placed : undefined}
                        aria-disabled={unavailable}
                        onClick={() =>
                          unavailable ? undefined : !owned ? openPurchase(decoration) : placed ? removeDecoration(decoration.id) : addDecoration(decoration)
                        }
                        className="group text-left"
                      >
                        <span className={`block relative aspect-square rounded-md overflow-hidden bg-grey ${tileClass(placed)}`}>
                          <span className={`absolute inset-0 ${unavailable || !owned ? 'opacity-50' : ''}`}>
                            <Thumbnail src={decoration.image} fit="contain" />
                          </span>
                          {placed && (
                            <span className="absolute top-xs right-xs w-5 h-5 rounded-full bg-green flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {!owned && (
                            <span className="absolute top-xs right-xs bg-white/90 rounded-full px-sm py-xs flex items-center gap-xs font-body text-xs text-dark-grey">
                              <LockIcon />
                              {buying ? '…' : decoration.price}
                            </span>
                          )}
                        </span>
                        <span className={labelClass(placed)}>
                          {decoration.name}
                          <span className="sr-only">
                            {placed
                              ? ' (on your desk, tap to remove)'
                              : owned
                                ? ''
                                : ` (costs ${decoration.price} points, tap to see it)`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>

        {/* Save */}
        <div>
          <button
            type="button"
            onClick={saveDesk}
            disabled={!unsaved || saveState.status === 'saving'}
            className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveState.status === 'saving' ? 'Saving…' : 'Save desk'}
          </button>
          <p
            className={`font-body text-xs text-center mt-sm ${saveState.status === 'error' ? 'text-black' : 'text-dark-grey'}`}
            role={saveState.status === 'error' ? 'alert' : undefined}
            aria-live="polite"
          >
            {saveState.status === 'error'
              ? saveState.error
              : saveState.status === 'saved' && !unsaved
                ? 'Desk saved.'
                : unsaved
                  ? "Unsaved changes won't be kept if you leave."
                  : '\u00a0'}
          </p>
        </div>
      </div>

      {confirming && (
        <PurchasePanel
          decoration={confirming}
          balance={balance}
          buying={purchase.buyingId === confirming.id}
          error={purchase.error}
          onBuy={() => buyDecoration(confirming)}
          onClose={closePurchase}
        />
      )}
    </div>
  );
}
