import { useLocalStorage, blobToBase64, downscaleImage, isStorageFull } from './useLocalStorage';

// Subscribed lists hook
export function useSubscribedLists() {
  return useLocalStorage('found_subscribed_lists', []);
}

// Captures hook
export function useCaptures() {
  const [captures, setCaptures] = useLocalStorage('found_captures', []);

  const addCapture = async (listId, itemId, photo = null, note = null, foundWithoutPhoto = false) => {
    if (isStorageFull()) {
      throw new Error('Storage is full. Please remove some captures to add more.');
    }

    const capture = {
      id: `${listId}-${itemId}-${Date.now()}`,
      listId,
      itemId,
      date: new Date().toISOString(),
      photo: photo ? await blobToBase64(photo) : null,
      note,
      foundWithoutPhoto,
    };

    setCaptures((prev) => [...prev, capture]);
    return capture;
  };

  const removeCapture = (captureId) => {
    setCaptures((prev) => prev.filter((c) => c.id !== captureId));
  };

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
    setCaptures,
    addCapture,
    removeCapture,
    getCapturesByList,
    getCapturedItemIds,
    isItemCaptured,
  };
}

// Streak data hook
export function useStreakData() {
  const [streakData, setStreakData] = useLocalStorage('found_streak_data', {
    currentStreak: 0,
    longestStreak: 0,
    completedDates: [], // Array of date strings (YYYY-MM-DD)
    weeklySaverUsed: false,
    weeklySaverDate: null, // Date when weekly saver was used
  });

  const markDayComplete = (date = new Date()) => {
    const dateStr = date.toISOString().split('T')[0];
    
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

  const checkAndResetStreak = (date = new Date()) => {
    const dateStr = date.toISOString().split('T')[0];
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    setStreakData((prev) => {
      // If today is completed, do nothing
      if (prev.completedDates.includes(dateStr)) {
        return prev;
      }

      // If yesterday was completed, streak continues
      if (prev.completedDates.includes(yesterdayStr)) {
        return prev;
      }

      // Check if weekly saver is available
      const weekAgo = new Date(date);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // If weekly saver was used less than a week ago, preserve streak
      if (prev.weeklySaverUsed && prev.weeklySaverDate) {
        const saverDate = new Date(prev.weeklySaverDate);
        const daysSinceSaver = Math.floor((date - saverDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceSaver < 7) {
          return prev;
        }
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

  const useWeeklySaver = (date = new Date()) => {
    setStreakData((prev) => ({
      ...prev,
      weeklySaverUsed: true,
      weeklySaverDate: date.toISOString(),
    }));
  };

  const isWeeklySaverAvailable = () => {
    if (!streakData.weeklySaverUsed) return true;
    
    const saverDate = new Date(streakData.weeklySaverDate);
    const now = new Date();
    const daysSinceSaver = Math.floor((now - saverDate) / (1000 * 60 * 60 * 24));
    
    return daysSinceSaver >= 7;
  };

  const getWeekData = (date = new Date()) => {
    const weekData = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      weekData.push({
        date: dateStr,
        completed: streakData.completedDates.includes(dateStr),
      });
    }

    return weekData;
  };

  return {
    streakData,
    setStreakData,
    markDayComplete,
    checkAndResetStreak,
    useWeeklySaver,
    isWeeklySaverAvailable,
    getWeekData,
  };
}

// Settings hook
export function useSettings() {
  return useLocalStorage('found_settings', {
    showStreak: true,
  });
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
