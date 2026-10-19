import { useLocalStorage } from './useLocalStorage';
import { addDays, toDateKey } from '../utils/date';

// Helpers over the user's logs (loaded from and saved to Supabase by useUserData)
export function useCaptures(captures) {
  const getCapturesByList = (listId) => {
    return captures.filter((c) => c.listId === listId);
  };

  const getCapturedItemIds = (listId) => {
    return captures
      .filter((c) => c.listId === listId)
      .map((c) => c.itemId);
  };

  const isItemCaptured = (listId, itemId) => {
    return captures.some((c) => c.listId === listId && c.itemId === itemId);
  };

  return {
    captures,
    getCapturesByList,
    getCapturedItemIds,
    isItemCaptured,
  };
}

const DAY_MS = 1000 * 60 * 60 * 24;
const SAVER_RECHARGE_DAYS = 7;

const isSaverAvailable = (data, date) =>
  !data.weeklySaverUsed || !data.weeklySaverDate || date - new Date(data.weeklySaverDate) >= SAVER_RECHARGE_DAYS * DAY_MS;

// Streak data hook. The data is saved to the user's Supabase profile by useUserData.
export function useStreakData(streakData, setStreakData) {

  const markDayComplete = (date = new Date()) => {
    const dateStr = toDateKey(date);
    
    setStreakData((prev) => {
      if (prev.completedDates.includes(dateStr)) {
        return prev; // Already marked
      }

      const newCompletedDates = [...prev.completedDates, dateStr];
      const newCurrentStreak = prev.currentStreak + 1;
      const newLongestStreak = Math.max(prev.longestStreak, newCurrentStreak);

      return {
        ...prev,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        completedDates: newCompletedDates,
      };
    });
  };

  // Runs when fresh data loads. A streak survives if today or yesterday counted; if only yesterday was missed,
  // the weekly saver (when recharged) is used automatically and yesterday is kept as a saved day.
  const checkAndResetStreak = (date = new Date()) => {
    const today = toDateKey(date);
    const yesterday = toDateKey(addDays(date, -1));
    const dayBefore = toDateKey(addDays(date, -2));

    setStreakData((prev) => {
      const savedDates = prev.savedDates ?? [];
      const counted = (key) => prev.completedDates.includes(key) || savedDates.includes(key);

      if (prev.currentStreak === 0 || counted(today) || counted(yesterday)) {
        return prev;
      }

      if (counted(dayBefore) && isSaverAvailable(prev, date)) {
        return {
          ...prev,
          weeklySaverUsed: true,
          weeklySaverDate: date.toISOString(),
          savedDates: [...savedDates, yesterday],
        };
      }

      // Reset streak
      return {
        ...prev,
        currentStreak: 0,
        weeklySaverUsed: false,
        weeklySaverDate: null,
      };
    });
  };

  const isWeeklySaverAvailable = () => isSaverAvailable(streakData, new Date());

  // Whole days until a used saver is ready again (0 when available).
  const getSaverRechargeDays = (date = new Date()) => {
    if (isSaverAvailable(streakData, date)) return 0;
    const readyAt = new Date(streakData.weeklySaverDate).getTime() + SAVER_RECHARGE_DAYS * DAY_MS;
    return Math.max(1, Math.ceil((readyAt - date) / DAY_MS));
  };

  const getWeekData = (date = new Date()) => {
    const weekData = [];
    const today = toDateKey(date);
    const startOfWeek = addDays(date, -date.getDay()); // Sunday

    for (let i = 0; i < 7; i++) {
      const dateStr = toDateKey(addDays(startOfWeek, i));
      weekData.push({
        date: dateStr,
        completed: streakData.completedDates.includes(dateStr),
        saved: (streakData.savedDates ?? []).includes(dateStr),
        isToday: dateStr === today,
      });
    }

    return weekData;
  };

  return {
    streakData,
    setStreakData,
    markDayComplete,
    checkAndResetStreak,
    isWeeklySaverAvailable,
    getSaverRechargeDays,
    getWeekData,
  };
}

// Event logs hook
export function useEventLogs() {
  const [eventLogs, setEventLogs] = useLocalStorage('found_event_logs', []);

  const logEvent = (eventType, data = {}) => {
    const event = {
      id: Date.now(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    setEventLogs((prev) => [...prev, event]);

    // Keep only last 1000 events to prevent storage issues
    setEventLogs((prev) => {
      if (prev.length > 1000) {
        return prev.slice(-1000);
      }
      return prev;
    });
  };

  const logAppOpen = () => {
    logEvent('app_open');
  };

  const logDailyFindCompleted = (listId, itemId, timeToComplete) => {
    logEvent('daily_find_completed', { listId, itemId, timeToComplete });
  };

  return {
    eventLogs,
    setEventLogs,
    logEvent,
    logAppOpen,
    logDailyFindCompleted,
  };
}
