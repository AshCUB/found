import { useState, useMemo } from 'react';
import { focusLists } from '../data/focusLists';

export default function Collection({
  captures,
  onClose,
}) {
  const [filterListId, setFilterListId] = useState('all');

  const filteredCaptures = useMemo(() => {
    if (filterListId === 'all') {
      return captures.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return captures
      .filter((c) => c.listId === filterListId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [captures, filterListId]);

  const getItemName = (listId, itemId) => {
    const list = focusLists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    return item?.name || 'Unknown';
  };

  const getListName = (listId) => {
    const list = focusLists.find((l) => l.id === listId);
    return list?.name || 'Unknown';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
          All Finds
        </h1>

        {/* Filter */}
        <div className="flex gap-xs overflow-x-auto pb-md">
          <button
            onClick={() => setFilterListId('all')}
            className={`font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors ${
              filterListId === 'all'
                ? 'bg-green text-white'
                : 'bg-white text-dark-grey hover:border-green border-2 border-transparent'
            }`}
          >
            All
          </button>
          {focusLists.map((list) => (
            <button
              key={list.id}
              onClick={() => setFilterListId(list.id)}
              className={`font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors ${
                filterListId === list.id
                  ? 'bg-green text-white'
                  : 'bg-white text-dark-grey hover:border-green border-2 border-transparent'
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>
      </div>

      {/* Captures List */}
      <div className="px-lg">
        {filteredCaptures.length === 0 ? (
          <div className="bg-white p-lg rounded-lg text-center shadow-sm">
            <p className="font-body text-sm text-dark-grey">
              No captures yet. Start finding things!
            </p>
          </div>
        ) : (
          <div className="space-y-md">
            {filteredCaptures.map((capture) => (
              <div
                key={capture.id}
                className="bg-white p-md rounded-lg shadow-sm"
              >
                <div className="flex gap-md">
                  {capture.photo ? (
                    <div className="w-20 h-20 rounded-lg bg-grey flex-shrink-0 overflow-hidden">
                      <img
                        src={capture.photo}
                        alt={getItemName(capture.listId, capture.itemId)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-grey flex-shrink-0 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-dark-grey"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-buttons text-sm text-dark-grey mb-xs">
                      {getListName(capture.listId)}
                    </p>
                    <h3 className="font-primary text-lg text-black mb-xs">
                      {getItemName(capture.listId, capture.itemId)}
                    </h3>
                    <p className="font-body text-xs text-dark-grey mb-xs">
                      {formatDate(capture.date)}
                    </p>
                    {capture.note && (
                      <p className="font-body text-xs text-dark-grey italic">
                        "{capture.note}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
