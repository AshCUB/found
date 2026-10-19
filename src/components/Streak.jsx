import { fromDateKey } from '../utils/date';

export default function Streak({
  streakData,
  totalFinds,
  showStreak,
  onToggleStreak,
  onClose,
}) {
  // The setting updates right away and is rolled back by the app if saving fails.
  const handleToggle = () => onToggleStreak(!showStreak);

  const weekData = streakData.weekData || [];
  const rechargeDays = streakData.saverRechargeDays ?? 0;

  const getDayName = (dateStr) => {
    return fromDateKey(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (dateStr) => {
    return fromDateKey(dateStr).getDate();
  };

  const dayClass = (day) => {
    if (day.completed) return 'bg-green text-white';
    if (day.saved) return 'bg-white text-green border-2 border-green border-dashed';
    if (day.isToday) return 'bg-grey text-black border-2 border-green';
    return 'bg-grey text-dark-grey';
  };

  const stats = [
    { label: 'Current', value: streakData.currentStreak, unit: streakData.currentStreak === 1 ? 'day' : 'days' },
    { label: 'Longest', value: streakData.longestStreak, unit: streakData.longestStreak === 1 ? 'day' : 'days' },
    { label: 'Total', value: totalFinds, unit: totalFinds === 1 ? 'find' : 'finds' },
  ];

  return (
    <div className="min-h-screen bg-grey animate-fade-in pb-lg">
      {/* Header */}
      <div className="p-lg pb-md max-w-md mx-auto">
        <button
          onClick={onClose}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Back
        </button>

        <h1 className="font-primary text-3xl text-green mb-md">
          Your Streak
        </h1>
      </div>

      {/* Streak Stats */}
      <div className="px-lg mb-lg max-w-md mx-auto">
        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <div className="grid grid-cols-3 text-center divide-x divide-grey">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-body text-xs text-dark-grey mb-xs">{stat.label}</p>
                <p className="font-primary text-3xl text-green">{stat.value}</p>
                <p className="font-body text-xs text-dark-grey">{stat.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Week View */}
        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <h3 className="font-buttons text-sm text-black mb-md">This Week</h3>
          <div className="grid grid-cols-7 gap-xs">
            {weekData.map((day) => (
              <div key={day.date} className="text-center">
                <p className="font-body text-xs text-dark-grey mb-xs">
                  {getDayName(day.date)}
                </p>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${dayClass(day)}`}
                  aria-label={`${getDayName(day.date)} ${getDayNumber(day.date)}${day.completed ? ', found' : day.saved ? ', saved' : ''}`}
                >
                  <span className="font-body text-xs" aria-hidden="true">
                    {getDayNumber(day.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Saver */}
        <div className="bg-white p-md rounded-lg shadow-sm mb-lg">
          <div className="flex items-center justify-between gap-md">
            <div>
              <p className="font-buttons text-sm text-black mb-xs">
                Streak saver
              </p>
              <p className="font-body text-xs text-dark-grey">
                Miss a day and your streak saver keeps it going. It recharges once a week.
              </p>
            </div>
            <span
              className={`font-buttons text-xs px-md py-xs rounded-full whitespace-nowrap ${
                streakData.isWeeklySaverAvailable ? 'bg-green text-white' : 'bg-grey text-dark-grey'
              }`}
            >
              {streakData.isWeeklySaverAvailable
                ? 'Ready'
                : `Back in ${rechargeDays} ${rechargeDays === 1 ? 'day' : 'days'}`}
            </span>
          </div>
        </div>

        {/* Toggle Streak Display */}
        <div className="bg-white p-md rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-md">
            <div>
              <p id="show-streak-label" className="font-buttons text-sm text-black mb-xs">
                Show streak on home
              </p>
              <p className="font-body text-xs text-dark-grey">
                Hide streak if you find it stressful
              </p>
            </div>
            <button
              onClick={handleToggle}
              role="switch"
              aria-checked={showStreak}
              aria-labelledby="show-streak-label"
              className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                showStreak ? 'bg-green' : 'bg-dark-grey'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  showStreak ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
