-- The user's desk (Desk tab): the desk material and the decorations placed on it.
-- Requires 20261018000000_create_profiles.sql to have been run first. Safe to run more than once.
-- Shape: { "materialId": text, "decorations": [{ "id": text, "x": 0-1, "y": 0-1 }] }, ids from src/data/deskDecor.js.
-- null until first saved (the app shows the default desk). Covered by the existing profiles row-level security.

alter table public.profiles add column if not exists desk_setup jsonb;
