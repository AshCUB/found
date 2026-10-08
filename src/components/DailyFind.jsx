import { useState, useEffect } from 'react';
import { focusLists } from '../data/focusLists';

export default function DailyFind({
  dailyFinds,
  currentIndex,
  onCapture,
  onTryAnother,
  onClose,
}) {
  const [localIndex, setLocalIndex] = useState(currentIndex);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    setLocalIndex(currentIndex);
  }, [currentIndex]);

  if (!dailyFinds || dailyFinds.length === 0) {
    return null;
  }

  const currentFind = dailyFinds[localIndex];
  const list = focusLists.find((l) => l.id === currentFind.listId);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    const touchEnd = e.touches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      setSwipeDirection(diff > 0 ? 'left' : 'right');
    }
  };

  const handleTouchEnd = () => {
    if (swipeDirection === 'left' && localIndex < dailyFinds.length - 1) {
      // Swipe left - show next list
      setLocalIndex(localIndex + 1);
    } else if (swipeDirection === 'right' && localIndex > 0) {
      // Swipe right - show previous list
      setLocalIndex(localIndex - 1);
    }
    setSwipeDirection(null);
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 bg-grey z-50 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="p-lg">
        <button
          onClick={onClose}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div className="px-lg pb-lg max-w-md mx-auto">
        <h2 className="font-buttons text-lg text-black mb-md">
          {list?.name}
        </h2>

        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <div className="w-full h-48 rounded-lg bg-grey mb-lg flex items-center justify-center">
            <span className="font-body text-sm text-dark-grey">Image</span>
          </div>

          <h3 className="font-primary text-2xl text-green mb-md">
            Today's daily find is {currentFind.item.name}
          </h3>

          <p className="font-body text-sm text-dark-grey mb-lg">
            {currentFind.item.fact}
          </p>

          {list?.warning && (
            <p className="font-body text-xs text-dark-grey italic mb-lg">
              {list.warning}
            </p>
          )}

          <p className="font-body text-sm text-black font-normal mb-lg">
            Take a minute. Look around for it.
          </p>

          {currentFind.captured ? (
            <div className="text-center p-md bg-green/10 rounded-lg">
              <p className="font-buttons text-lg text-green">
                ✓ Captured
              </p>
            </div>
          ) : (
            <button
              onClick={() => onCapture(currentFind)}
              className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
            >
              Capture it
            </button>
          )}
        </div>

        {/* Try Another Button */}
        {!currentFind.captured && (
          <button
            onClick={() => onTryAnother(currentFind)}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors w-full"
          >
            Try another
          </button>
        )}

        {/* Swipe Indicator */}
        {dailyFinds.length > 1 && (
          <div className="flex justify-center gap-xs mt-lg">
            {dailyFinds.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === localIndex ? 'bg-green' : 'bg-dark-grey/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
