// Decoration price tiers, named after the tier folders in the desk decor source folder (see
// scripts/import-desk-decor.mjs). Free decorations are owned by everyone; the rest are bought with points (1 point per
// find added to the collection). Shared by the app and the import script, which writes these prices to
// supabase/desk_decor_prices.sql so Supabase can check purchases.
export const TIER_PRICES = { free: 0, low: 10, med: 20, high: 35 };

// Other folder names accepted for a tier.
export const TIER_ALIASES = { medium: 'med' };
