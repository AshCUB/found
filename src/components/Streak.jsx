import { useState } from 'react';

export default function Streak({
  streakData,
  showStreak,
  onToggleStreak,
  onClose,
}) {
  const [localShowStreak, setLocalShowStreak] = useState(showStreak);

  const handleToggle = () => {
    const newValue = !localShowStreak;
    setLocalShowStreak(newValue);
    onToggleStreak(newValue);
  };

  const weekData = streakData.weekData || [];

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  return (
    <div className="min-h-screen bg-grey animate-fade-in pb-lg">
      {/* Header */}
      <div className="p-lg pb-md">
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
      <div className="px-lg mb-lg">
        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <div className="flex justify-around text-center">
            <div>
              <p className="font-body text-xs text-dark-grey mb-xs">Current</p>
              <p className="font-primary text-3xl text-green">
                {streakData.currentStreak}
              </p>
              <p className="font-body text-xs text-dark-grey">days</p>
            </div>
            <div className="border-l border-grey pl-lg">
              <p className="font-body text-xs text-dark-grey mb-xs">Longest</p>
              <p className="font-primary text-3xl text-green">
                {streakData.longestStreak}
              </p>
              <p className="font-body text-xs text-dark-grey">days</p>
            </div>
          </div>
        </div>

        {/* Weekly Saver */}
        <div className="bg-white p-md rounded-lg shadow-sm mb-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-buttons text-sm text-black mb-xs">
                Weekly Saver
              </p>
              <p className="font-body text-xs text-dark-grey">
                One missed day per week won't reset your streak
              </p>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                streakData.isWeeklySaverAvailable
                  ? 'border-green bg-green'
                  : 'border-dark-grey'
              }`}
            >
              {streakData.isWeeklySaverAvailable && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Week View */}
        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <h3 className="font-buttons text-sm text-black mb-md">This Week</h3>
          <div className="grid grid-cols-7 gap-xs">
            {weekData.map((day, index) => (
              <div key={index} className="text-center">
                <p className="font-body text-xs text-dark-grey mb-xs">
                  {getDayName(day.date)}
                </p>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                    day.completed
                      ? 'bg-green text-white'
                      : 'bg-grey text-dark-grey'
                  }`}
                >
                  <span className="font-body text-xs">
                    {getDayNumber(day.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle Streak Display */}
        <div className="bg-white p-md rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-buttons text-sm text-black mb-xs">
                Show streak on home
              </p>
              <p className="font-body text-xs text-dark-grey">
                Hide streak if you find it stressful
              </p>
            </div>
            <button
              onClick={handleToggle}
              className={`w-12 h-6 rounded-full transition-colors ${
                localShowStreak ? 'bg-green' : 'bg-dark-grey'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  localShowStreak ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
