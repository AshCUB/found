import { useState } from 'react';
import { focusLists } from '../data/focusLists';

export default function ListPage({
  subscribedListIds,
  capturedItemIdsByList,
  onCaptureItem,
  onClose,
}) {
  const [selectedListId, setSelectedListId] = useState(
    subscribedListIds[0] || null
  );

  if (!selectedListId) {
    return (
      <div className="min-h-screen bg-grey p-lg animate-fade-in">
        <button
          onClick={onClose}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Back
        </button>
        <p className="font-body text-sm text-dark-grey">
          No lists subscribed yet.
        </p>
      </div>
    );
  }

  const list = focusLists.find((l) => l.id === selectedListId);
  const capturedItemIds = capturedItemIdsByList[selectedListId] || [];
  const capturedCount = capturedItemIds.length;

  const handleItemClick = (item) => {
    if (!capturedItemIds.includes(item.id)) {
      onCaptureItem(selectedListId, item);
    }
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

        {/* List Selector */}
        <div className="flex gap-xs overflow-x-auto pb-md">
          {subscribedListIds.map((listId) => {
            const l = focusLists.find((list) => list.id === listId);
            return (
              <button
                key={listId}
                onClick={() => setSelectedListId(listId)}
                className={`font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors ${
                  selectedListId === listId
                    ? 'bg-green text-white'
                    : 'bg-white text-dark-grey hover:border-green border-2 border-transparent'
                }`}
              >
                {l?.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Content */}
      <div className="px-lg">
        <div className="mb-lg">
          <h1 className="font-primary text-3xl text-green mb-xs">
            {list?.name}
          </h1>
          <p className="font-body text-sm text-dark-grey">
            {capturedCount} of {list?.itemCount} found
          </p>
        </div>

        {/* Warning for Wildflowers and Animals */}
        {list?.warning && (
          <div className="bg-white p-md rounded-lg mb-lg shadow-sm">
            <p className="font-body text-xs text-dark-grey italic">
              {list.warning}
            </p>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-2 gap-md">
          {list?.items.map((item) => {
            const isCaptured = capturedItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-md rounded-lg cursor-pointer transition-all ${
                  isCaptured
                    ? 'bg-white shadow-sm'
                    : 'bg-dark-grey/10 opacity-50'
                }`}
              >
                <div className="w-full h-24 rounded-lg bg-grey mb-md flex items-center justify-center overflow-hidden">
                  {isCaptured ? (
                    <span className="font-body text-xs text-dark-grey">Photo</span>
                  ) : (
                    <span className="font-body text-xs text-dark-grey">?</span>
                  )}
                </div>
                {isCaptured && (
                  <p className="font-buttons text-sm text-black text-center">
                    {item.name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
