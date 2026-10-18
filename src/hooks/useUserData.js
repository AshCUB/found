import { useEffect, useRef, useState } from 'react';
import {
  addLists as addListsRemote,
  createLog,
  deleteLog as deleteLogRemote,
  fetchUserData,
  flushPendingPhotoDeletes,
  replaceLists as replaceListsRemote,
  saveProfileFields,
  updateLogNote as updateLogNoteRemote,
} from '../services/userData';

export const DEFAULT_STREAK = {
  currentStreak: 0,
  longestStreak: 0,
  completedDates: [], // Array of date strings (YYYY-MM-DD)
  weeklySaverUsed: false,
  weeklySaverDate: null, // Date when weekly saver was used
};

// Per-user copy of the last data loaded from Supabase, so the app can render instantly while it refreshes.
// Only a cache: Supabase is the source of truth, and it never contains photos (just their storage paths).
const cacheKey = (userId) => `found_cache:${userId}`;

function readCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)));
  } catch {
    return null;
  }
}

function writeCache(userId, data) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    // Storage full or unavailable: the app still works, it just loads from Supabase next time.
  }
}

export function clearUserCache(userId) {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// The signed-in user's selected lists, logs, streak and settings, loaded from Supabase.
// data is null until loaded (or cached); writes go to Supabase first and only update the screen once saved.
export function useUserData(userId) {
  const [state, setState] = useState({ userId: undefined, data: null, status: 'idle', error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const cached = readCache(userId);
    setState({ userId, data: cached, status: cached ? 'refreshing' : 'loading', error: null });
    fetchUserData(userId).then(
      (data) =>
        active &&
        // Keep the cached object when nothing changed, so the screen doesn't re-render (e.g. reshuffle today's finds).
        setState({ userId, data: cached && JSON.stringify(cached) === JSON.stringify(data) ? cached : data, status: 'ready', error: null }),
      (error) => {
        console.error('Error loading user data:', error.cause ?? error);
        if (active) setState((s) => ({ ...s, status: 'error', error }));
      },
    );
    flushPendingPhotoDeletes(userId);
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  // Ignore results that belong to a previous user (e.g. right after switching accounts).
  const current = state.userId === userId ? state : { data: null, status: 'idle', error: null };
  const dataRef = useRef(current.data);
  dataRef.current = current.data;

  useEffect(() => {
    if (state.userId && state.data) writeCache(state.userId, state.data);
  }, [state.userId, state.data]);

  const update = (change) =>
    setState((s) => (s.userId === userId && s.data ? { ...s, data: { ...s.data, ...change(s.data) } } : s));

  const replaceLists = async (listIds) => {
    await replaceListsRemote(userId, listIds);
    update(() => ({ lists: [...listIds] }));
  };

  const addLists = async (listIds) => {
    await addListsRemote(userId, listIds);
    update((d) => ({ lists: [...new Set([...d.lists, ...listIds])] }));
  };

  const addLog = async (input) => {
    const log = await createLog(userId, input);
    update((d) => ({ logs: [log, ...d.logs] }));
    return log;
  };

  const updateLogNote = async (logId, note) => {
    await updateLogNoteRemote(userId, logId, note);
    update((d) => ({ logs: d.logs.map((log) => (log.id === logId ? { ...log, note } : log)) }));
  };

  const deleteLog = async (logId) => {
    const log = dataRef.current?.logs.find((l) => l.id === logId);
    if (!log) return;
    await deleteLogRemote(userId, log);
    update((d) => ({ logs: d.logs.filter((l) => l.id !== logId) }));
  };

  // Accepts a value or an updater function, like a state setter. Saved in the background.
  const setStreak = (value) => {
    const prev = dataRef.current?.streak ?? DEFAULT_STREAK;
    const next = value instanceof Function ? value(prev) : value;
    if (next === prev || !dataRef.current) return;
    dataRef.current = { ...dataRef.current, streak: next };
    update(() => ({ streak: next }));
    saveProfileFields(userId, { streak: next }).catch((error) => console.error('Error saving streak:', error.cause ?? error));
  };

  const setShowStreak = async (showStreak) => {
    const prev = dataRef.current?.showStreak;
    update(() => ({ showStreak }));
    try {
      await saveProfileFields(userId, { showStreak });
    } catch (error) {
      update(() => ({ showStreak: prev }));
      throw error;
    }
  };

  return {
    data: current.data,
    // True once fresh data has arrived from Supabase (not just the cache).
    synced: current.status === 'ready',
    error: current.error,
    retry: () => setAttempt((n) => n + 1),
    replaceLists,
    addLists,
    addLog,
    updateLogNote,
    deleteLog,
    setStreak,
    setShowStreak,
  };
}
