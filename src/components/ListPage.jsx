import { useState } from 'react';
import { focusLists, visibleFocusLists } from '../data/focusLists';
import ItemImage from './ItemImage';
import ProgressBar from './ProgressBar';

export default function ListPage({
  subscribedListIds,
  initialListId,
  listProgress,
  capturedItemIdsByList,
  onCaptureItem,
  onAddList,
  onClose,
}) {
  const [selectedListId, setSelectedListId] = useState(() =>
    subscribedListIds.includes(initialListId) ? initialListId : subscribedListIds[0] || null
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
        <div className="bg-white p-lg rounded-lg text-center shadow-sm max-w-md mx-auto">
          <p className="font-body text-sm text-dark-grey mb-md">
            No lists yet. Add one to start finding.
          </p>
          <button
            onClick={onAddList}
            className="font-buttons text-sm bg-green text-white px-lg py-md rounded-full hover:opacity-90 transition-opacity"
          >
            Add a list
          </button>
        </div>
      </div>
    );
  }

  const list = focusLists.find((l) => l.id === selectedListId);
  const capturedItemIds = capturedItemIdsByList[selectedListId] || [];
  const { found = 0, total = list?.items.length ?? 0 } = listProgress.find((p) => p.listId === selectedListId) ?? {};
  const complete = total > 0 && found >= total;
  const canAddList = visibleFocusLists.some((l) => !subscribedListIds.includes(l.id));

  const handleItemClick = (item) => {
    if (!capturedItemIds.includes(item.id)) {
      onCaptureItem(selectedListId, item);
    }
  };

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

        {/* List Selector */}
        {(subscribedListIds.length > 1 || canAddList) && (
          <div className="flex gap-xs overflow-x-auto pb-md">
            {subscribedListIds.length > 1 && subscribedListIds.map((listId) => {
              const l = focusLists.find((list) => list.id === listId);
              return (
                <button
                  key={listId}
                  onClick={() => setSelectedListId(listId)}
                  aria-pressed={selectedListId === listId}
                  className={`font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors border-2 ${
                    selectedListId === listId
                      ? 'bg-green text-white border-green'
                      : 'bg-white text-dark-grey border-transparent hover:border-green'
                  }`}
                >
                  {l?.name}
                </button>
              );
            })}
            {canAddList && (
              <button
                onClick={onAddList}
                className="font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors border-2 border-dashed border-green text-green bg-white hover:bg-green hover:text-white"
              >
                + Add list
              </button>
            )}
          </div>
        )}
      </div>

      {/* List Content */}
      <div className="px-lg max-w-md mx-auto">
        <div className="mb-lg">
          <h1 className="font-primary text-3xl text-green mb-xs">
            {list?.name}
          </h1>
          {list?.description && (
            <p className="font-body text-sm text-dark-grey mb-md">{list.description}</p>
          )}
          <div className="flex items-center gap-md">
            <ProgressBar value={found} total={total} label={`${list?.name} progress`} className="h-sm" />
            <p className="font-body text-xs text-dark-grey whitespace-nowrap">
              {found} of {total} found
            </p>
          </div>
          {complete && (
            <p className="font-buttons text-sm text-green mt-md">
              You've found everything on this list.
            </p>
          )}
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
            return isCaptured ? (
              <div key={item.id} className="p-md rounded-lg bg-white shadow-sm">
                <ItemImage src={item.image} alt={item.name} fitPadding="p-sm" className="w-full h-24 rounded-lg mb-md" />
                <p className="font-buttons text-sm text-black text-center">
                  {item.name}
                </p>
              </div>
            ) : (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                aria-label="Undiscovered item"
                className="p-md rounded-lg bg-dark-grey/10 opacity-50 hover:opacity-70 transition-opacity"
              >
                <div className="w-full h-24 rounded-lg bg-green/10 flex items-center justify-center">
                  <span className="font-body text-xs text-dark-grey">?</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
