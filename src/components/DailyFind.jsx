import { useState, useEffect } from 'react';
import { focusLists } from '../data/focusLists';
import { isFittedImage } from './ItemImage';

export default function DailyFind({
  dailyFinds,
  currentIndex,
  onCapture,
  onSwap,
  onClose,
}) {
  const [localIndex, setLocalIndex] = useState(currentIndex);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [brokenImage, setBrokenImage] = useState(null);

  useEffect(() => {
    setLocalIndex(currentIndex);
  }, [currentIndex]);

  const goToList = (index) => {
    setLocalIndex((index + dailyFinds.length) % dailyFinds.length);
  };

  // Keyboard: Escape closes, left/right arrows switch lists.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && dailyFinds.length > 1) goToList(localIndex - 1);
      else if (e.key === 'ArrowRight' && dailyFinds.length > 1) goToList(localIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const currentFind = dailyFinds?.[localIndex];
  const list = focusLists.find((l) => l.id === currentFind?.listId);

  if (!currentFind) {
    return null;
  }

  const currentItem = currentFind.item;
  const isFitted = isFittedImage(currentItem.image);
  const showImage = currentItem.image && brokenImage !== currentItem.image;

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
      goToList(localIndex + 1);
    } else if (swipeDirection === 'right' && localIndex > 0) {
      // Swipe right - show previous list
      goToList(localIndex - 1);
    }
    setSwipeDirection(null);
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 bg-grey z-50 animate-fade-in overflow-y-auto"
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
        {/* List Navigation */}
        <div className="flex items-center justify-between mb-md">
          {dailyFinds.length > 1 && (
            <button
              onClick={() => goToList(localIndex - 1)}
              className="font-buttons text-xl text-dark-grey hover:text-green transition-colors px-sm"
              aria-label="Previous list"
            >
              ‹
            </button>
          )}
          <h2 className="font-buttons text-lg text-black flex-1 text-center">
            {list?.name}
          </h2>
          {dailyFinds.length > 1 && (
            <button
              onClick={() => goToList(localIndex + 1)}
              className="font-buttons text-xl text-dark-grey hover:text-green transition-colors px-sm"
              aria-label="Next list"
            >
              ›
            </button>
          )}
        </div>

        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          <div className="flex items-center gap-sm mb-sm">
            <div className="flex-1 min-w-0 h-48 rounded-lg bg-grey flex items-center justify-center overflow-hidden relative">
              {showImage ? (
                <img
                  key={currentItem.image}
                  src={currentItem.image}
                  alt={currentItem.name}
                  decoding="async"
                  className={`w-full h-full ${isFitted ? 'object-contain p-lg' : 'object-cover'}`}
                  onError={() => setBrokenImage(currentItem.image)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green/20 to-blue/20">
                  <span className="font-body text-sm text-dark-grey">Image</span>
                </div>
              )}
            </div>
          </div>


          <h3 className="mb-md">
            <span className="block font-buttons text-base text-dark-grey">
              {currentFind.captured ? 'Today you found' : "Today's daily find is"}
            </span>
            <span className="block font-primary text-2xl text-green">{currentItem.name}</span>
          </h3>

          <p className="font-body text-sm text-dark-grey mb-lg">
            {currentItem.fact}
          </p>

          {list?.warning && (
            <p className="font-body text-xs text-dark-grey italic mb-lg">
              {list.warning}
            </p>
          )}

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
          {currentFind.canSwap && (
            <button
              onClick={() => onSwap(currentFind.listId)}
              className="font-buttons text-sm text-dark-grey hover:text-green transition-colors w-full mt-md"
            >
              Swap it
            </button>
          )}
        </div>

        {/* Swipe Indicator */}
        {dailyFinds.length > 1 && (
          <div className="flex justify-center gap-xs mt-lg">
            {dailyFinds.map((find, index) => (
              <button
                key={find.listId}
                onClick={() => goToList(index)}
                aria-label={`Go to list ${index + 1}`}
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
