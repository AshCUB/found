// Desk Decor Data
// The user's desk (Desk tab) and the backdrop behind their envelope: a desk material photo with up to
// MAX_DECORATIONS decorations placed on it.
//
// The catalog (deskDecorCatalog.json) and images are generated from the desk decor source folder by
// `npm run import-desk-decor` (see scripts/import-desk-decor.mjs). Ids are saved to user accounts, so never change or
// reuse an existing id (removing an item is safe: desks that used it fall back gracefully).
//
// Materials are all free. Decorations cost points by tier (deskDecorTiers.js); free ones are owned by everyone, the
// rest once bought (Supabase checks purchases and saved desks against supabase/desk_decor_prices.sql).
import catalog from './deskDecorCatalog.json';
import { TIER_PRICES } from './deskDecorTiers';

// Desk photos fill the screen behind the envelope, so portrait images work best.
export const deskMaterials = catalog.materials.map(({ id, name }) => ({
  id,
  name,
  image: `images/desk/materials/${id}.webp`,
}));

export const DEFAULT_MATERIAL_ID = 'dark-wood';

// Transparent images, seen from above. `size` is how wide the decoration is drawn, as a share of the desk's shorter
// side (so it looks the same size on any screen).
export const deskDecorations = catalog.decorations.map(({ id, name, description, category, tier, size }) => ({
  id,
  name,
  description,
  category,
  image: `images/desk/decorations/${id}.webp`,
  size,
  price: TIER_PRICES[tier],
}));

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

// Whether the user can place the decoration: it's free or they bought it (`ownedIds`: bought decoration ids).
export const isDecorationOwned = (decoration, ownedIds = []) => decoration.price === 0 || ownedIds.includes(decoration.id);

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);

// Turns a saved desk (or null for a new user) into one that's safe to show: unknown materials fall back to the default,
// decorations no longer in the catalog, not owned (see isDecorationOwned) or repeated are dropped, positions are kept
// on the desk, and at most MAX_DECORATIONS are kept. Shape: { materialId, decorations: [{ id, x, y }] }.
export function normalizeDeskSetup(saved, ownedIds = []) {
  const materialId = findDeskMaterial(saved?.materialId) ? saved.materialId : DEFAULT_MATERIAL_ID;
  const seen = new Set();
  const owned = (id) => {
    const decoration = findDeskDecoration(id);
    return decoration && isDecorationOwned(decoration, ownedIds);
  };
  const decorations = (Array.isArray(saved?.decorations) ? saved.decorations : [])
    .filter((placed) => placed && owned(placed.id) && !seen.has(placed.id) && seen.add(placed.id))
    .slice(0, MAX_DECORATIONS)
    .map(({ id, x, y }) => ({ id, x: clamp01(x), y: clamp01(y) }));
  return { materialId, decorations };
}

// The first placement spot not already near a placed decoration (or the center if all are taken).
export function nextPlacementSpot(decorations) {
  const taken = (spot) => decorations.some((placed) => Math.hypot(placed.x - spot.x, placed.y - spot.y) < 0.1);
  return PLACEMENT_SPOTS.find((spot) => !taken(spot)) ?? { x: 0.5, y: 0.5 };
}
