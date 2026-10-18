// One-time import of the data this browser saved before accounts existed (selected lists, logs with
// base64 photos, streak, settings) into the signed-in user's Supabase account.
// The old local copy is never touched until the user confirms, after the import has been verified.
import {
  addLists,
  createLog,
  fetchImportedLogs,
  fetchListIds,
  fetchProfileStreak,
  listPhotoFiles,
  saveProfileFields,
} from './userData';

const LEGACY_KEYS = {
  lists: 'found_subscribed_lists',
  captures: 'found_captures',
  streak: 'found_streak_data',
  settings: 'found_settings',
};
// { [userId]: 'imported' | 'dismissed' }, so each account is only asked once on this browser.
const IMPORT_STATE_KEY = 'found_legacy_import';

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

// Returns the old local data, or null if there is nothing worth importing.
export function readLegacyData() {
  const lists = Array.isArray(readJson(LEGACY_KEYS.lists)) ? readJson(LEGACY_KEYS.lists) : [];
  const captures = (Array.isArray(readJson(LEGACY_KEYS.captures)) ? readJson(LEGACY_KEYS.captures) : []).filter(
    (c) => c && c.id && c.listId && c.itemId,
  );
  const streak = readJson(LEGACY_KEYS.streak);
  const settings = readJson(LEGACY_KEYS.settings);
  if (!lists.length && !captures.length) return null;
  return { lists, captures, streak, settings };
}

export function getImportState(userId) {
  return readJson(IMPORT_STATE_KEY)?.[userId];
}

export function setImportState(userId, value) {
  try {
    localStorage.setItem(IMPORT_STATE_KEY, JSON.stringify({ ...readJson(IMPORT_STATE_KEY), [userId]: value }));
  } catch {
    // Storage unavailable: the prompt may show again next time, which is harmless (imports never duplicate).
  }
}

// Only called after the user has confirmed the import worked.
export function removeLegacyData() {
  Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('found_daily_finds');
}

// Checks that every old list, log and photo is now in the account. Returns { ok, lists, logs, photos, missing }.
export async function verifyLegacyImport(userId, legacy) {
  const [rows, listIds, files] = await Promise.all([fetchImportedLogs(userId), fetchListIds(userId), listPhotoFiles(userId)]);
  const byLegacyId = new Map(rows.map((row) => [row.legacy_id, row]));
  const missing = [];
  let photos = 0;
  legacy.captures.forEach((capture) => {
    const row = byLegacyId.get(capture.id);
    if (!row) return missing.push(capture.id);
    if (!capture.photo) return;
    if (row.photo_path && files.has(row.photo_path) && row.thumb_path && files.has(row.thumb_path)) photos += 1;
    else missing.push(capture.id);
  });
  const missingLists = legacy.lists.filter((id) => !listIds.includes(id));
  return {
    ok: !missing.length && !missingLists.length,
    lists: legacy.lists.length - missingLists.length,
    logs: legacy.captures.length - legacy.captures.filter((c) => !byLegacyId.has(c.id)).length,
    photos,
    missing: [...missing, ...missingLists],
  };
}

// Imports whatever isn't in the account yet, so it is safe to retry after a failure.
// onProgress(done, total) is called as logs are uploaded.
export async function importLegacyData(userId, legacy, onProgress = () => {}) {
  if (legacy.lists.length) await addLists(userId, legacy.lists);

  // Streak and settings only fill in an account that has never saved its own.
  if (legacy.streak && (await fetchProfileStreak(userId)) === null) {
    await saveProfileFields(userId, {
      streak: legacy.streak,
      ...(typeof legacy.settings?.showStreak === 'boolean' && { showStreak: legacy.settings.showStreak }),
    });
  }

  const done = new Set((await fetchImportedLogs(userId)).map((row) => row.legacy_id));
  const todo = legacy.captures.filter((capture) => !done.has(capture.id));
  // A log that fails is skipped and reported as missing by the verification, so the rest still import.
  for (let i = 0; i < todo.length; i += 1) {
    const capture = todo[i];
    onProgress(i, todo.length);
    try {
      const photo = capture.photo ? await (await fetch(capture.photo)).blob() : null;
      await createLog(userId, {
        listId: capture.listId,
        itemId: capture.itemId,
        note: capture.note ?? null,
        foundWithoutPhoto: !!capture.foundWithoutPhoto,
        photo,
        date: capture.date,
        legacyId: capture.id,
      });
    } catch (error) {
      console.error(`Error importing log ${capture.id}:`, error.cause ?? error);
    }
  }
  onProgress(todo.length, todo.length);
  return verifyLegacyImport(userId, legacy);
}
