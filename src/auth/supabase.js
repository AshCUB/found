import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// localStorage key for the persisted session; set explicitly so session.js can check for it synchronously.
export const AUTH_STORAGE_KEY = 'found-auth';

// null when the env vars are missing, so the rest of the app still loads.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { auth: { persistSession: true, storageKey: AUTH_STORAGE_KEY } })
    : null;
