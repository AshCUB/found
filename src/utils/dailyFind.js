import { focusLists, getMoonPhaseItem } from '../data/focusLists';

// Get today's daily find for a specific list
export function getDailyFindForList(listId, capturedItemIds, date = new Date()) {
  const list = focusLists.find((l) => l.id === listId);
  if (!list) return null;

  // Special handling for moon phases - based on date
  if (listId === 'moon-phases') {
    const moonItem = getMoonPhaseItem(date);
    return moonItem;
  }

  // For other lists, get uncaptured items
  const uncapturedItems = list.items.filter(
    (item) => !capturedItemIds.includes(item.id)
  );

  // For wildflowers, filter by bloom month
  if (listId === 'wildflowers') {
    const currentMonth = date.getMonth() + 1; // 1-12
    const inBloomItems = uncapturedItems.filter(
      (item) => item.bloomMonths && item.bloomMonths.includes(currentMonth)
    );

    // If there are items in bloom, return a random one
    if (inBloomItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * inBloomItems.length);
      return inBloomItems[randomIndex];
    }

    // If no items in bloom, return a random uncaptured item
    if (uncapturedItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * uncapturedItems.length);
      return uncapturedItems[randomIndex];
    }

    // If all items captured, return null
    return null;
  }

  // For colors and animals, return a random uncaptured item
  if (uncapturedItems.length > 0) {
    const randomIndex = Math.floor(Math.random() * uncapturedItems.length);
    return uncapturedItems[randomIndex];
  }

  // If all items captured, return null
  return null;
}

// Get all daily finds for subscribed lists
export function getAllDailyFinds(subscribedListIds, capturedItemIdsByList, date = new Date()) {
  const dailyFinds = [];

  subscribedListIds.forEach((listId) => {
    const capturedItemIds = capturedItemIdsByList[listId] || [];
    const dailyFind = getDailyFindForList(listId, capturedItemIds, date);
    
    if (dailyFind) {
      dailyFinds.push({
        listId,
        item: dailyFind,
        captured: capturedItemIds.includes(dailyFind.id),
      });
    }
  });

  return dailyFinds;
}

// Get a different item from the same list (Try Another)
export function getAlternativeItem(listId, capturedItemIds, currentItemId) {
  const list = focusLists.find((l) => l.id === listId);
  if (!list) return null;

  // Get uncaptured items excluding the current one
  const uncapturedItems = list.items.filter(
    (item) => !capturedItemIds.includes(item.id) && item.id !== currentItemId
  );

  if (uncapturedItems.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * uncapturedItems.length);
  return uncapturedItems[randomIndex];
}

// Check if daily find should be refreshed (new day)
export function shouldRefreshDailyFind(lastRefreshDate, date = new Date()) {
  if (!lastRefreshDate) return true;
  
  const lastDate = new Date(lastRefreshDate);
  const currentDate = new Date(date);
  
  return (
    lastDate.getDate() !== currentDate.getDate() ||
    lastDate.getMonth() !== currentDate.getMonth() ||
    lastDate.getFullYear() !== currentDate.getFullYear()
  );
}

// Store daily finds in localStorage with date
export function storeDailyFinds(dailyFinds) {
  const data = {
    date: new Date().toISOString().split('T')[0],
    finds: dailyFinds,
  };
  localStorage.setItem('found_daily_finds', JSON.stringify(data));
}

// Load daily finds from localStorage
export function loadDailyFinds() {
  const stored = localStorage.getItem('found_daily_finds');
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    return data;
  } catch (e) {
    console.error('Error loading daily finds:', e);
    return null;
  }
}

// Clear daily finds (called when user unsubscribes from a list)
export function clearDailyFinds() {
  localStorage.removeItem('found_daily_finds');
}
