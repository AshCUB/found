// Reads and writes the signed-in user's lists, logs, streak/settings and log photos in Supabase.
// Supabase is the source of truth; row-level security and storage policies limit every request to the user's own data.
// Every function throws an Error with a user-facing message (original error in `cause`).
import { supabase } from '../auth/supabase';
import { DEV_USER_ID } from '../auth/session';
import { compressPhoto } from '../utils/image';

export const PHOTO_BUCKET = 'log-photos';
const SIGNED_URL_TTL_S = 60 * 60;
const PAGE_SIZE = 1000;
const LOG_COLUMNS = 'id, list_id, item_id, note, found_at, found_without_photo, photo_path, thumb_path, legacy_id';
const PENDING_DELETES_KEY = (userId) => `found_pending_photo_deletes:${userId}`;
const DEV_DATA_KEY = 'found_dev_data';

const LOAD_MESSAGE = "we couldn't load your account. check your connection and try again.";
const SAVE_MESSAGE = "we couldn't save your find. check your connection and try again.";
const UPLOAD_MESSAGE = "we couldn't upload your photo. check your connection and try again.";

function fail(message, cause) {
  return new Error(message, { cause });
}

const isDev = (userId) => userId === DEV_USER_ID;
const bucket = () => supabase.storage.from(PHOTO_BUCKET);

// crypto.randomUUID needs a secure context (https or localhost); fall back for e.g. testing on a phone over the LAN.
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function fromRow(row) {
  return {
    id: row.id,
    listId: row.list_id,
    itemId: row.item_id,
    date: row.found_at,
    note: row.note,
    foundWithoutPhoto: row.found_without_photo,
    photoPath: row.photo_path,
    thumbPath: row.thumb_path,
    legacyId: row.legacy_id,
  };
}

// --- Dev-only signed-in shortcut: no Supabase user, so keep everything in this browser. ---

function readDev() {
  try {
    return { lists: [], logs: [], streak: null, showStreak: true, ...JSON.parse(localStorage.getItem(DEV_DATA_KEY)) };
  } catch {
    return { lists: [], logs: [], streak: null, showStreak: true };
  }
}

function writeDev(change) {
  const next = { ...readDev(), ...change(readDev()) };
  localStorage.setItem(DEV_DATA_KEY, JSON.stringify(next));
  return next;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Loading ---

async function fetchAllLogs(userId) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('logs')
      .select(LOG_COLUMNS)
      .eq('user_id', userId)
      .order('found_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows.map(fromRow);
  }
}

// Returns { lists: string[], logs, streak (object or null if never saved), showStreak }.
export async function fetchUserData(userId) {
  if (isDev(userId)) return readDev();
  try {
    const [lists, logs, profile] = await Promise.all([
      supabase.from('user_lists').select('list_id').eq('user_id', userId).order('created_at'),
      fetchAllLogs(userId),
      supabase.from('profiles').select('streak_data, show_streak').eq('id', userId).maybeSingle(),
    ]);
    if (lists.error) throw lists.error;
    if (profile.error) throw profile.error;
    return {
      lists: lists.data.map((row) => row.list_id),
      logs,
      streak: profile.data?.streak_data ?? null,
      showStreak: profile.data?.show_streak ?? true,
    };
  } catch (error) {
    throw fail(LOAD_MESSAGE, error);
  }
}

// --- Selected focus lists ---

export async function addLists(userId, listIds) {
  if (isDev(userId)) return void writeDev((d) => ({ lists: [...new Set([...d.lists, ...listIds])] }));
  const { error } = await supabase
    .from('user_lists')
    .upsert(listIds.map((listId) => ({ user_id: userId, list_id: listId })), { onConflict: 'user_id,list_id', ignoreDuplicates: true });
  if (error) throw fail("we couldn't save your lists. check your connection and try again.", error);
}

// Makes the user's selection exactly listIds.
export async function replaceLists(userId, listIds) {
  if (isDev(userId)) return void writeDev(() => ({ lists: [...listIds] }));
  if (listIds.length) await addLists(userId, listIds);
  let query = supabase.from('user_lists').delete().eq('user_id', userId);
  if (listIds.length) query = query.not('list_id', 'in', `(${listIds.map((id) => `"${id}"`).join(',')})`);
  const { error } = await query;
  if (error) throw fail("we couldn't save your lists. check your connection and try again.", error);
}

// --- Streak and settings (columns on the profiles table) ---

export async function saveProfileFields(userId, { streak, showStreak }) {
  const fields = {};
  if (streak !== undefined) fields.streak_data = streak;
  if (showStreak !== undefined) fields.show_streak = showStreak;
  if (isDev(userId)) return void writeDev(() => ({ ...(streak !== undefined && { streak }), ...(showStreak !== undefined && { showStreak }) }));
  // Upsert so it still works if the profile row is missing; existing columns (e.g. onboarding) are left as they are.
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...fields });
  if (error) throw fail("we couldn't save your changes. check your connection and try again.", error);
}

// --- Photos ---

const photoPathsFor = (userId, logId) => ({ photoPath: `${userId}/${logId}.jpg`, thumbPath: `${userId}/${logId}_thumb.jpg` });

async function removeFiles(paths) {
  const { error } = await bucket().remove(paths);
  if (error) throw error;
}

// Compresses the photo in the browser, then uploads the full-size and thumbnail versions.
async function uploadPhoto(userId, logId, file) {
  const { photo, thumb } = await compressPhoto(file);
  const paths = photoPathsFor(userId, logId);
  const options = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
  const results = await Promise.all([
    bucket().upload(paths.photoPath, photo, options),
    bucket().upload(paths.thumbPath, thumb, options),
  ]);
  const failed = results.find((result) => result.error);
  if (failed) {
    await removeFiles([paths.photoPath, paths.thumbPath]).catch(() => {});
    throw fail(UPLOAD_MESSAGE, failed.error);
  }
  return paths;
}

// Photo files whose log was deleted but whose removal failed; retried on the next load.
function readPendingDeletes(userId) {
  try {
    return JSON.parse(localStorage.getItem(PENDING_DELETES_KEY(userId))) || [];
  } catch {
    return [];
  }
}

function writePendingDeletes(userId, paths) {
  try {
    if (paths.length) localStorage.setItem(PENDING_DELETES_KEY(userId), JSON.stringify(paths));
    else localStorage.removeItem(PENDING_DELETES_KEY(userId));
  } catch {
    // Storage unavailable: the files just stay until the next delete attempt.
  }
}

export async function flushPendingPhotoDeletes(userId) {
  if (isDev(userId)) return;
  const pending = readPendingDeletes(userId);
  if (!pending.length) return;
  try {
    await removeFiles(pending);
    writePendingDeletes(userId, []);
  } catch (error) {
    console.error('Error removing deleted photos:', error);
  }
}

// Signed URLs are cached in memory until shortly before they expire.
const signedUrlCache = new Map();

export function clearSignedUrlCache() {
  signedUrlCache.clear();
}

// Returns { [path]: url } for the given storage paths.
export async function getSignedPhotoUrls(paths) {
  const now = Date.now();
  const missing = [...new Set(paths)].filter(
    (path) => !path.startsWith('data:') && !(signedUrlCache.get(path)?.expiresAt > now + 60_000),
  );
  if (missing.length) {
    const { data, error } = await bucket().createSignedUrls(missing, SIGNED_URL_TTL_S);
    if (error) throw fail("we couldn't load your photos. check your connection and try again.", error);
    data.forEach(({ path, signedUrl }) => {
      if (signedUrl) signedUrlCache.set(path, { url: signedUrl, expiresAt: now + SIGNED_URL_TTL_S * 1000 });
    });
  }
  return Object.fromEntries(
    paths.map((path) => [path, path.startsWith('data:') ? path : signedUrlCache.get(path)?.url]).filter(([, url]) => url),
  );
}

// --- Logs ---

// Uploads the photo (if any) and saves the log. Nothing is left behind if either step fails.
export async function createLog(userId, { listId, itemId, note = null, foundWithoutPhoto = false, photo = null, date, legacyId = null }) {
  const id = newId();
  const foundAt = date || new Date().toISOString();
  if (isDev(userId)) {
    const thumbPath = photo ? await blobToDataUrl((await compressPhoto(photo)).thumb) : null;
    const log = { id, listId, itemId, date: foundAt, note, foundWithoutPhoto, photoPath: null, thumbPath, legacyId };
    writeDev((d) => ({ logs: [log, ...d.logs] }));
    return log;
  }
  const paths = photo ? await uploadPhoto(userId, id, photo) : { photoPath: null, thumbPath: null };
  const { data, error } = await supabase
    .from('logs')
    .insert({
      id,
      user_id: userId,
      list_id: listId,
      item_id: itemId,
      note,
      found_without_photo: foundWithoutPhoto,
      found_at: foundAt,
      photo_path: paths.photoPath,
      thumb_path: paths.thumbPath,
      legacy_id: legacyId,
    })
    .select(LOG_COLUMNS)
    .single();
  if (error) {
    if (photo) await removeFiles([paths.photoPath, paths.thumbPath]).catch(() => {});
    throw fail(SAVE_MESSAGE, error);
  }
  return fromRow(data);
}

export async function updateLogNote(userId, logId, note) {
  if (isDev(userId)) {
    writeDev((d) => ({ logs: d.logs.map((log) => (log.id === logId ? { ...log, note } : log)) }));
    return;
  }
  const { data, error } = await supabase.from('logs').update({ note }).eq('id', logId).eq('user_id', userId).select('id');
  if (error || !data.length) throw fail("we couldn't save your note. check your connection and try again.", error);
}

// Deletes the log, then its photo files. If only the file removal fails, it is retried on the next load.
export async function deleteLog(userId, log) {
  if (isDev(userId)) return void writeDev((d) => ({ logs: d.logs.filter((l) => l.id !== log.id) }));
  const { error } = await supabase.from('logs').delete().eq('id', log.id).eq('user_id', userId);
  if (error) throw fail("we couldn't delete that find. check your connection and try again.", error);
  const paths = [log.photoPath, log.thumbPath].filter(Boolean);
  if (!paths.length) return;
  try {
    await removeFiles(paths);
  } catch (removeError) {
    console.error('Error removing photo files, will retry:', removeError);
    writePendingDeletes(userId, [...readPendingDeletes(userId), ...paths]);
  }
}

// --- Used by the one-time import of this browser's old local data ---

export async function fetchImportedLogs(userId) {
  const { data, error } = await supabase
    .from('logs')
    .select('legacy_id, photo_path, thumb_path')
    .eq('user_id', userId)
    .not('legacy_id', 'is', null);
  if (error) throw error;
  return data;
}

export async function fetchListIds(userId) {
  const { data, error } = await supabase.from('user_lists').select('list_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.list_id);
}

export async function fetchProfileStreak(userId) {
  const { data, error } = await supabase.from('profiles').select('streak_data').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.streak_data ?? null;
}

// Names of all files in the user's photo folder.
export async function listPhotoFiles(userId) {
  const names = new Set();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await bucket().list(userId, { limit: PAGE_SIZE, offset });
    if (error) throw error;
    data.forEach((file) => names.add(`${userId}/${file.name}`));
    if (data.length < PAGE_SIZE) return names;
  }
}
