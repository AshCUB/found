import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_DECORATIONS,
  deskDecorations,
  deskMaterials,
  nextPlacementSpot,
  normalizeDeskSetup,
} from '../../data/deskDecor';
import DeskScene from './DeskScene';
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
  return { left: 0.5 - w / 2, top: 0.6 - h / 2, width: w, height: h };
}

// Keeps a decoration's center far enough from the desk's edges that the whole decoration stays on the desk.
function clampToDesk(position, element, desk) {
  const clampAxis = (value, half) => (half >= 0.5 ? 0.5 : Math.min(1 - half, Math.max(half, value)));
  return {
    x: clampAxis(position.x, element.offsetWidth / 2 / desk.width),
    y: clampAxis(position.y, element.offsetHeight / 2 / desk.height),
  };
}

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

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function DeskDecor({ deskSetup, onChange, onClose }) {
  const setup = useMemo(() => normalizeDeskSetup(deskSetup), [deskSetup]);
  const [selectedId, setSelectedId] = useState(null);
  const viewport = useViewportSize();
  const deskRef = useRef(null);
  const dragRef = useRef(null);

  const placedIds = new Set(setup.decorations.map((placed) => placed.id));
  const full = setup.decorations.length >= MAX_DECORATIONS;
  const envelope = envelopeArea(viewport);

  const save = (changes) => onChange({ ...setup, ...changes });

  const chooseMaterial = (material) => {
    if (material.unlocked && material.id !== setup.materialId) save({ materialId: material.id });
  };

  const addDecoration = (decoration) => {
    if (!decoration.unlocked || placedIds.has(decoration.id) || full) return;
    const spot = nextPlacementSpot(setup.decorations);
    save({ decorations: [...setup.decorations, { id: decoration.id, ...spot }] });
    setSelectedId(decoration.id);
  };

  const removeDecoration = (id) => {
    save({ decorations: setup.decorations.filter((placed) => placed.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const moveDecoration = (id, position) =>
    save({ decorations: setup.decorations.map((placed) => (placed.id === id ? { ...placed, ...position } : placed)) });

  // Dragging moves the element directly (no re-render per frame, so it stays smooth) and saves once on release.
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
    setSelectedId(placed.id);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_START_DISTANCE) return;
    drag.moved = true;
    drag.element.classList.add('is-dragging');
    const desk = deskRef.current.getBoundingClientRect();
    drag.position = clampToDesk(
      {
        x: (event.clientX - drag.grabX - desk.left) / desk.width,
        y: (event.clientY - drag.grabY - desk.top) / desk.height,
      },
      drag.element,
      desk
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
    moveDecoration(placed.id, clampToDesk(position, event.currentTarget, deskRef.current.getBoundingClientRect()));
  };

  const renderDecoration = (placed, decoration, image, props) => {
    const selected = selectedId === placed.id;
    return (
      <div
        {...props}
        className={`${props.className} desk-decor__item${selected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${decoration.name}. Drag or use the arrow keys to move it, Delete to remove it.`}
        onPointerDown={(event) => handlePointerDown(event, placed)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(event) => handleDecorationKey(event, placed)}
        onFocus={() => setSelectedId(placed.id)}
      >
        {image}
        {selected && (
          <button
            type="button"
            className="desk-decor__remove"
            aria-label={`Remove ${decoration.name}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => removeDecoration(placed.id)}
          >
            ×
          </button>
        )}
      </div>
    );
  };

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

        <h1 className="font-primary text-3xl text-green mb-xs">Your Desk</h1>
        <p className="font-body text-xs text-dark-grey">
          Your letters arrive here. Drag decorations to arrange them.
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
          onPointerDown={(event) => !event.target.closest('.desk-decor__item') && setSelectedId(null)}
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
                  disabled={!material.unlocked}
                  onClick={() => chooseMaterial(material)}
                  className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span
                    className={`block relative aspect-[3/4] rounded-md overflow-hidden bg-grey border-2 transition-colors ${
                      selected ? 'border-green' : 'border-transparent'
                    }`}
                  >
                    <Thumbnail src={material.image} fit="cover" />
                    {!material.unlocked && (
                      <span className="absolute top-xs right-xs bg-white/90 rounded-full p-xs text-dark-grey">
                        <LockIcon />
                      </span>
                    )}
                  </span>
                  <span className={`block font-body text-xs mt-xs ${selected ? 'text-green' : 'text-dark-grey'}`}>
                    {material.name}
                    {!material.unlocked && <span className="sr-only"> (locked)</span>}
                  </span>
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
          <p className="font-body text-xs text-dark-grey mb-md" aria-live="polite">
            {full ? 'Your desk is full. Remove a decoration to add another.' : 'Tap a decoration to add or remove it.'}
          </p>

          {categories.map((category) => (
            <div key={category} className="mb-md last:mb-0">
              <h3 className="font-body text-xs text-dark-grey mb-sm">{category}</h3>
              <div className="grid grid-cols-3 gap-sm">
                {deskDecorations
                  .filter((decoration) => decoration.category === category)
                  .map((decoration) => {
                    const placed = placedIds.has(decoration.id);
                    const unavailable = !decoration.unlocked || (!placed && full);
                    return (
                      <button
                        key={decoration.id}
                        type="button"
                        aria-pressed={placed}
                        disabled={unavailable}
                        onClick={() => (placed ? removeDecoration(decoration.id) : addDecoration(decoration))}
                        className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span
                          className={`block relative aspect-square rounded-md overflow-hidden bg-grey border-2 transition-colors ${
                            placed ? 'border-green' : 'border-transparent'
                          }`}
                        >
                          <Thumbnail src={decoration.image} fit="contain" />
                          {placed && (
                            <span className="absolute top-xs right-xs w-5 h-5 rounded-full bg-green flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {!decoration.unlocked && (
                            <span className="absolute top-xs right-xs bg-white/90 rounded-full p-xs text-dark-grey">
                              <LockIcon />
                            </span>
                          )}
                        </span>
                        <span className={`block font-body text-xs mt-xs ${placed ? 'text-green' : 'text-dark-grey'}`}>
                          {decoration.name}
                          <span className="sr-only">
                            {placed ? ' (on your desk, tap to remove)' : !decoration.unlocked ? ' (locked)' : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
