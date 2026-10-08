import { focusLists } from '../data/focusLists';

export default function Home({
  streakData,
  showStreak,
  dailyFinds,
  onViewDailyFind,
  onAddList,
  onViewCollection,
  onViewStreak,
}) {
  return (
    <div className="min-h-screen bg-grey animate-fade-in">
      {/* Header */}
      <div className="p-lg pb-md">
        <div className="flex justify-between items-center mb-lg">
          <h1 className="font-primary text-3xl text-green">Found</h1>
          <button
            onClick={onViewStreak}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors"
          >
            Streak
          </button>
        </div>

        {/* Streak Display */}
        {showStreak && (
          <div className="bg-white p-md rounded-lg mb-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-xs text-dark-grey mb-xs">Current streak</p>
                <p className="font-primary text-2xl text-green">
                  {streakData.currentStreak} days
                </p>
              </div>
              {streakData.isWeeklySaverAvailable && (
                <div className="text-right">
                  <p className="font-body text-xs text-dark-grey mb-xs">Weekly saver</p>
                  <p className="font-buttons text-sm text-green">Available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today's Daily Finds */}
      <div className="px-lg pb-lg">
        <h2 className="font-buttons text-lg text-black mb-md">Today's finds</h2>
        
        {dailyFinds.length === 0 ? (
          <div className="bg-white p-lg rounded-lg text-center shadow-sm">
            <p className="font-body text-sm text-dark-grey mb-md">
              No daily finds yet. Add a list to get started.
            </p>
            <button
              onClick={onAddList}
              className="font-buttons text-sm bg-green text-white px-lg py-md rounded-full"
            >
              Add a list
            </button>
          </div>
        ) : (
          <div className="space-y-md">
            {dailyFinds.map((dailyFind) => {
              const list = focusLists.find((l) => l.id === dailyFind.listId);
              return (
                <div
                  key={dailyFind.listId}
                  onClick={() => onViewDailyFind(dailyFind)}
                  className={`p-md rounded-lg cursor-pointer transition-all ${
                    dailyFind.captured
                      ? 'bg-white border-2 border-green'
                      : 'bg-white border-2 border-transparent hover:border-green'
                  } shadow-sm`}
                >
                  <div className="flex items-center gap-md">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-grey flex items-center justify-center">
                      <span className="font-body text-xs text-dark-grey">Image</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-buttons text-lg text-black mb-xs">
                        {list?.name}
                      </h3>
                      <p className="font-body text-sm text-dark-grey">
                        {dailyFind.item.name}
                      </p>
                    </div>
                    {dailyFind.captured && (
                      <div className="w-6 h-6 rounded-full bg-green flex items-center justify-center">
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add List Button */}
        {dailyFinds.length > 0 && (
          <button
            onClick={onAddList}
            className="w-full mt-lg p-md rounded-lg border-2 border-dashed border-dark-grey hover:border-green transition-colors"
          >
            <p className="font-buttons text-sm text-dark-grey text-center">
              + Add a list
            </p>
          </button>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey p-md">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={onViewCollection}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors"
          >
            Collection
          </button>
          <button
            onClick={onViewStreak}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors"
          >
            Streak
          </button>
        </div>
      </div>
    </div>
  );
}
