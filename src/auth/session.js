// Single place the app asks "is the user signed in?", backed by Supabase Auth.
// The session is persisted in localStorage by the Supabase client, so users stay signed in across reloads.
import { AUTH_STORAGE_KEY, supabase } from './supabase';

const AUTH_TIMEOUT_MS = 1000;
const DEV_SIGNED_IN_KEY = 'found_dev_signed_in';
// Present in the URL when returning from an email verification link.
const AUTH_REDIRECT_PATTERN = /access_token=|refresh_token=|error_description=|[?&]code=/;

function devSignedIn() {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(DEV_SIGNED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

// Returns true/false when the auth state is known synchronously, or null if it must be fetched.
export function getCachedSignedIn() {
  if (devSignedIn()) return true;
  if (!supabase) return false;
  try {
    const { hash, search } = window.location;
    if (!localStorage.getItem(AUTH_STORAGE_KEY) && !AUTH_REDIRECT_PATTERN.test(hash + search)) return false;
  } catch {
    // Storage unavailable: fall through and ask Supabase.
  }
  return null;
}

async function fetchSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Resolves to true/false, never waiting longer than AUTH_TIMEOUT_MS (treated as signed out).
export function resolveSignedIn() {
  const cached = getCachedSignedIn();
  if (cached !== null) return Promise.resolve(cached);
  return Promise.race([
    fetchSession().then((session) => !!session, () => false),
    new Promise((resolve) => setTimeout(() => resolve(false), AUTH_TIMEOUT_MS)),
  ]);
}

// Calls callback(true/false) whenever the user signs in or out (including token refreshes). Returns an unsubscribe function.
export function onSignedInChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(devSignedIn() || !!session));
  return () => data.subscription.unsubscribe();
}
