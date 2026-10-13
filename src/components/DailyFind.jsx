import { useState, useEffect } from 'react';
import { focusLists } from '../data/focusLists';

export default function DailyFind({
  dailyFinds,
  currentIndex,
  onCapture,
  onClose,
}) {
  const getTodayItemIndex = (findIndex) => {
    const find = dailyFinds?.[findIndex];
    const findList = focusLists.find((l) => l.id === find?.listId);
    return Math.max(0, findList?.items.findIndex((i) => i.id === find?.item?.id) ?? 0);
  };

  const [localIndex, setLocalIndex] = useState(currentIndex);
  const [itemIndex, setItemIndex] = useState(() => getTodayItemIndex(currentIndex));
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [brokenImage, setBrokenImage] = useState(null);

  useEffect(() => {
    setLocalIndex(currentIndex);
    setItemIndex(getTodayItemIndex(currentIndex));
  }, [currentIndex]);

  const currentFind = dailyFinds?.[localIndex];
  const list = focusLists.find((l) => l.id === currentFind?.listId);

  // Warm the cache for the items the arrows lead to so switching is instant
  useEffect(() => {
    if (!list) return;
    const count = list.items.length;
    [itemIndex + 1, itemIndex - 1, itemIndex + 2].forEach((i) => {
      const src = list.items[(i + count) % count]?.image;
      if (src) new Image().src = src;
    });
  }, [list, itemIndex]);

  if (!currentFind) {
    return null;
  }

  const currentItem = list?.items[itemIndex] || currentFind.item;
  const isFitted = /shape-|letters-numbers\//.test(currentItem.image ?? '');
  const showImage = currentItem.image && brokenImage !== currentItem.image;

  const goToList = (index) => {
    const wrapped = (index + dailyFinds.length) % dailyFinds.length;
    setLocalIndex(wrapped);
    setItemIndex(getTodayItemIndex(wrapped));
  };

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

  const handlePreviousItem = () => {
    if (itemIndex > 0) {
      setItemIndex(itemIndex - 1);
    } else {
      // Cycle to the last item
      setItemIndex(list.items.length - 1);
    }
  };

  const handleNextItem = () => {
    if (itemIndex < list.items.length - 1) {
      setItemIndex(itemIndex + 1);
    } else {
      // Cycle to the first item
      setItemIndex(0);
    }
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
            {list && list.items.length > 1 && (
              <button
                onClick={handlePreviousItem}
                className="flex-shrink-0 w-8 h-8 font-buttons text-xl text-dark-grey hover:text-green transition-colors flex items-center justify-center"
                aria-label="Previous item"
              >
                ←
              </button>
            )}
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
            {list && list.items.length > 1 && (
              <button
                onClick={handleNextItem}
                className="flex-shrink-0 w-8 h-8 font-buttons text-xl text-dark-grey hover:text-green transition-colors flex items-center justify-center"
                aria-label="Next item"
              >
                →
              </button>
            )}
          </div>

          {list && list.items.length > 1 && (
            <p className="font-body text-xs text-dark-grey text-center mb-lg">
              {itemIndex + 1} / {list.items.length}
            </p>
          )}

          <h3 className="mb-md">
            <span className="block font-buttons text-base text-dark-grey">Today's daily find is</span>
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
              onClick={() => onCapture({ ...currentFind, item: currentItem })}
              className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
            >
              Capture it
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
