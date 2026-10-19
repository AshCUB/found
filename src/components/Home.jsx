import { focusLists } from '../data/focusLists';
import ItemImage from './ItemImage';
import ProgressBar from './ProgressBar';

const navIconProps = {
  className: 'w-6 h-6 mx-auto mb-xs',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const NAV_ICONS = {
  lists: <svg {...navIconProps}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>,
  collection: (
    <svg {...navIconProps}>
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  streak: <svg {...navIconProps}><path d="M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>,
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function Home({
  streakData,
  showStreak,
  dailyFinds,
  listProgress,
  onViewDailyFind,
  onViewList,
  onAddList,
  onViewCollection,
  onViewStreak,
  onGoToIntro,
  onSignOut,
}) {
  const foundToday = dailyFinds.filter((find) => find.captured).length;
  const allFound = dailyFinds.length > 0 && foundToday === dailyFinds.length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const navItems = [
    listProgress.length > 0 && { id: 'lists', label: 'Lists', onClick: () => onViewList(listProgress[0].listId) },
    { id: 'collection', label: 'Collection', onClick: onViewCollection },
    { id: 'streak', label: 'Streak', onClick: onViewStreak },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-grey animate-fade-in pb-3xl">
      {/* Header */}
      <div className="p-lg pb-md max-w-md mx-auto">
        <div className="flex justify-between items-center mb-xs">
          <h1>
            <button onClick={onGoToIntro} className="font-primary text-3xl text-green hover:opacity-80 transition-opacity">
              Found
            </button>
          </h1>
          <button
            onClick={onSignOut}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors"
          >
            Sign out
          </button>
        </div>
        <p className="font-body text-xs text-dark-grey mb-lg">{today}</p>

        {/* Streak Display */}
        {showStreak && (
          <button
            onClick={onViewStreak}
            className="w-full text-left bg-white p-md rounded-lg mb-lg shadow-sm border-2 border-transparent hover:border-green transition-colors"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="font-body text-xs text-dark-grey mb-xs">Current streak</p>
                <p className="font-primary text-2xl text-green">
                  {plural(streakData.currentStreak, 'day')}
                </p>
              </div>
              <p className="font-body text-xs text-dark-grey">
                Longest: {streakData.longestStreak}
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Today's Daily Finds */}
      <div className="px-lg pb-lg max-w-md mx-auto">
        <div className="flex items-baseline justify-between mb-md">
          <h2 className="font-buttons text-lg text-black">Today's finds</h2>
          {dailyFinds.length > 0 && (
            <p className="font-body text-xs text-dark-grey">
              {foundToday} of {dailyFinds.length} found
            </p>
          )}
        </div>
        
        {dailyFinds.length === 0 ? (
          <div className="bg-white p-lg rounded-lg text-center shadow-sm">
            <p className="font-body text-sm text-dark-grey mb-md">
              {listProgress.length > 0
                ? "You've found everything in your lists. Add another list to keep going."
                : 'No daily finds yet. Add a list to get started.'}
            </p>
            <button
              onClick={onAddList}
              className="font-buttons text-sm bg-green text-white px-lg py-md rounded-full hover:opacity-90 transition-opacity"
            >
              Add a list
            </button>
          </div>
        ) : (
          <div className="space-y-md">
            {dailyFinds.map((dailyFind) => {
              const list = focusLists.find((l) => l.id === dailyFind.listId);
              return (
                <button
                  key={dailyFind.listId}
                  onClick={() => onViewDailyFind(dailyFind)}
                  className={`w-full text-left p-md rounded-lg transition-all ${
                    dailyFind.captured
                      ? 'bg-green border-2 border-green'
                      : 'bg-white border-2 border-transparent hover:border-green'
                  } shadow-sm`}
                >
                  <div className="flex items-center gap-md">
                    <ItemImage
                      src={dailyFind.item.image || list?.image}
                      alt={dailyFind.item.name}
                      className="w-16 h-16 rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-buttons text-lg mb-xs ${dailyFind.captured ? 'text-white' : 'text-black'}`}>
                        {list?.name}
                      </h3>
                      <p className={`font-body text-sm ${dailyFind.captured ? 'text-white' : 'text-dark-grey'}`}>
                        {dailyFind.item.name}
                      </p>
                    </div>
                    {dailyFind.captured ? (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label="Found"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <span className="font-buttons text-xl text-dark-grey flex-shrink-0" aria-hidden="true">›</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {allFound && (
          <p className="font-body text-sm text-dark-grey text-center mt-lg">
            That's everything for today. Enjoy the rest of your day.
          </p>
        )}
      </div>

      {/* Your Lists */}
      {listProgress.length > 0 && (
        <div className="px-lg pb-lg max-w-md mx-auto">
          <h2 className="font-buttons text-lg text-black mb-md">Your lists</h2>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-grey">
            {listProgress.map(({ listId, found, total }) => {
              const list = focusLists.find((l) => l.id === listId);
              return (
                <button
                  key={listId}
                  onClick={() => onViewList(listId)}
                  className="w-full text-left p-md flex items-center gap-md hover:bg-black/5 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <ItemImage src={list.image} alt="" className="w-12 h-12 rounded-md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-sm mb-sm">
                      <p className="font-buttons text-sm text-black truncate">{list.name}</p>
                      <p className="font-body text-xs text-dark-grey whitespace-nowrap">
                        {found} of {total}
                      </p>
                    </div>
                    <ProgressBar value={found} total={total} label={`${list.name} progress`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey px-md pt-sm pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="font-buttons text-xs text-dark-grey hover:text-green transition-colors px-md py-xs"
            >
              {NAV_ICONS[item.id]}
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
