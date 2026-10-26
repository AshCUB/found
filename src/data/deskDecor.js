// Desk Decor Data
// The user's desk (Desk tab) and the backdrop behind their envelope: a desk material photo with up to
// MAX_DECORATIONS decorations placed on it.
//
// To add a material or decoration: put the image in public/images/desk/materials or public/images/desk/decorations,
// run `npm run optimize-desk-decor`, and add one entry below. Ids are saved to user accounts, so never change or
// reuse an existing id (removing an entry is safe: desks that used it fall back gracefully).
//
// `unlocked: false` shows an item in the picker but doesn't let users choose it (for future locked/purchasable items).

// Desk photos fill the screen behind the envelope, so portrait images work best.
export const deskMaterials = [
  { id: 'dark-wood', name: 'Dark wood', image: 'images/desk/materials/dark-wood.webp', unlocked: true },
  { id: 'light-wood', name: 'Light wood', image: 'images/desk/materials/light-wood.webp', unlocked: true },
  { id: 'white-wood', name: 'White wood', image: 'images/desk/materials/white-wood.webp', unlocked: true },
];

export const DEFAULT_MATERIAL_ID = 'dark-wood';

// Transparent images, seen from above. `size` is how wide the decoration is drawn, as a share of the desk's shorter
// side (so it looks the same size on any screen).
export const deskDecorations = [
  { id: 'black-candle', name: 'Black candle', category: 'Candles', image: 'images/desk/decorations/black-candle.webp', size: 0.34, unlocked: true },
  { id: 'blue-candle', name: 'Blue candle', category: 'Candles', image: 'images/desk/decorations/blue-candle.webp', size: 0.26, unlocked: true },
  { id: 'teal-candle', name: 'Teal candle', category: 'Candles', image: 'images/desk/decorations/teal-candle.webp', size: 0.27, unlocked: true },
  { id: 'coffee', name: 'Coffee', category: 'Drinks', image: 'images/desk/decorations/coffee.webp', size: 0.32, unlocked: true },
  { id: 'hot-cocoa', name: 'Hot cocoa', category: 'Drinks', image: 'images/desk/decorations/hot-cocoa.webp', size: 0.36, unlocked: true },
  { id: 'tea', name: 'Tea', category: 'Drinks', image: 'images/desk/decorations/tea.webp', size: 0.33, unlocked: true },
  { id: 'colored-pencils', name: 'Colored pencils', category: 'Pens', image: 'images/desk/decorations/colored-pencils.webp', size: 0.3, unlocked: true },
  { id: 'markers', name: 'Markers', category: 'Pens', image: 'images/desk/decorations/markers.webp', size: 0.33, unlocked: true },
  { id: 'calathea', name: 'Calathea', category: 'Plants', image: 'images/desk/decorations/calathea.webp', size: 0.42, unlocked: true },
  { id: 'fern', name: 'Fern', category: 'Plants', image: 'images/desk/decorations/fern.webp', size: 0.42, unlocked: true },
  { id: 'pothos', name: 'Pothos', category: 'Plants', image: 'images/desk/decorations/pothos.webp', size: 0.4, unlocked: true },
];

export const MAX_DECORATIONS = 4;
const DEFAULT_DECORATION_SIZE = 0.3;

// Where newly added decorations go: the desk's corners, clear of the envelope in the middle.
// Positions are the decoration's center as a share of the desk's width (x) and height (y).
const PLACEMENT_SPOTS = [
  { x: 0.26, y: 0.2 },
  { x: 0.74, y: 0.22 },
  { x: 0.25, y: 0.82 },
  { x: 0.75, y: 0.84 },
];

export const findDeskMaterial = (id) => deskMaterials.find((material) => material.id === id);
export const findDeskDecoration = (id) => deskDecorations.find((decoration) => decoration.id === id);
export const decorationSize = (decoration) => decoration.size ?? DEFAULT_DECORATION_SIZE;

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);

// Turns a saved desk (or null for a new user) into one that's safe to show: unknown materials fall back to the default,
// decorations no longer in the catalog (or repeated) are dropped, positions are kept on the desk, and at most
// MAX_DECORATIONS are kept. Shape: { materialId, decorations: [{ id, x, y }] }.
export function normalizeDeskSetup(saved) {
  const materialId = findDeskMaterial(saved?.materialId) ? saved.materialId : DEFAULT_MATERIAL_ID;
  const seen = new Set();
  const decorations = (Array.isArray(saved?.decorations) ? saved.decorations : [])
    .filter((placed) => placed && findDeskDecoration(placed.id) && !seen.has(placed.id) && seen.add(placed.id))
    .slice(0, MAX_DECORATIONS)
    .map(({ id, x, y }) => ({ id, x: clamp01(x), y: clamp01(y) }));
  return { materialId, decorations };
}

// The first placement spot not already near a placed decoration (or the center if all are taken).
export function nextPlacementSpot(decorations) {
  const taken = (spot) => decorations.some((placed) => Math.hypot(placed.x - spot.x, placed.y - spot.y) < 0.1);
  return PLACEMENT_SPOTS.find((spot) => !taken(spot)) ?? { x: 0.5, y: 0.5 };
}
