// Calendar days are keyed by the user's local date (YYYY-MM-DD), so a day matches what they see on their clock.
export function toDateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Parses a date key as local midnight (new Date('YYYY-MM-DD') would parse it as UTC).
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// "Today", "Yesterday", or a short date (with the year only when it isn't this year).
export function formatDayLabel(date, now = new Date()) {
  const key = toDateKey(date);
  if (key === toDateKey(now)) return 'Today';
  if (key === toDateKey(addDays(now, -1))) return 'Yesterday';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}
