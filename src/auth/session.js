// Single place the app asks "who is signed in?", backed by Supabase Auth.
// The session is persisted in localStorage by the Supabase client, so users stay signed in across reloads.
// User ids are: a string when signed in, null when signed out, undefined while still being resolved.
import { AUTH_STORAGE_KEY, supabase } from './supabase';

// Safety net so a hung network request can't leave the app loading forever.
const AUTH_TIMEOUT_MS = 8000;
const DEV_SIGNED_IN_KEY = 'found_dev_signed_in';
// Stands in for a real user id when the dev-only signed-in shortcut is on.
export const DEV_USER_ID = 'dev';
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

// Returns the user id (or null) when the auth state is known synchronously, or undefined if it must be fetched.
export function getCachedUserId() {
  if (devSignedIn()) return DEV_USER_ID;
  if (!supabase) return null;
  try {
    const { hash, search } = window.location;
    if (!localStorage.getItem(AUTH_STORAGE_KEY) && !AUTH_REDIRECT_PATTERN.test(hash + search)) return null;
  } catch {
    // Storage unavailable: fall through and ask Supabase.
  }
  return undefined;
}

async function fetchSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Resolves to the user id or null, never waiting longer than AUTH_TIMEOUT_MS (treated as signed out).
export function resolveUserId() {
  const cached = getCachedUserId();
  if (cached !== undefined) return Promise.resolve(cached);
  return Promise.race([
    fetchSession().then((session) => session?.user.id ?? null, () => null),
    new Promise((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ]);
}

// Signs out on this device only. Supabase clears the stored session even if the network request fails.
export async function signOut() {
  try {
    localStorage.removeItem(DEV_SIGNED_IN_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) console.error('Error signing out:', error);
}

// Calls callback(userId or null) whenever the user signs in or out (including token refreshes). Returns an unsubscribe function.
export function onUserIdChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    callback(devSignedIn() ? DEV_USER_ID : session?.user.id ?? null),
  );
  return () => data.subscription.unsubscribe();
}
