// Single place the app asks "is the user signed in?".
// No real authentication exists yet, so every user is treated as signed out.
// When auth is added, implement fetchSession() (and getCachedSignedIn() if the
// session can be read synchronously, e.g. from a stored token).

const AUTH_TIMEOUT_MS = 1000;
const DEV_SIGNED_IN_KEY = 'found_dev_signed_in';

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
  return false;
}

async function fetchSession() {
  return null;
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
