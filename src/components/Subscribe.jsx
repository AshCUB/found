import { useState } from 'react';
import { focusLists } from '../data/focusLists';

export default function Subscribe({ onSubscribe, subscribedLists }) {
  const [selectedLists, setSelectedLists] = useState([]);

  const toggleList = (listId) => {
    setSelectedLists((prev) => {
      if (prev.includes(listId)) {
        return prev.filter((id) => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  const handleSubscribe = () => {
    if (selectedLists.length > 0) {
      onSubscribe(selectedLists);
    }
  };

  return (
    <div className="min-h-screen bg-grey flex flex-col p-lg animate-fade-in">
      <div className="max-w-md w-full mx-auto">
        <h1 className="font-primary text-3xl text-green mb-md">
          Choose your first list
        </h1>
        <p className="font-body text-sm text-dark-grey mb-xl">
          Pick one or more lists to start your journey. You can add more later.
        </p>

        <div className="space-y-md mb-xl">
          {focusLists.map((list) => (
            <div
              key={list.id}
              onClick={() => toggleList(list.id)}
              className={`p-md rounded-lg cursor-pointer transition-all ${
                selectedLists.includes(list.id)
                  ? 'bg-green border-2 border-green'
                  : 'bg-white border-2 border-transparent hover:border-green'
              }`}
            >
              <div className="flex items-center gap-md">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-grey flex items-center justify-center">
                  <span className="font-body text-xs text-dark-grey">Image</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-buttons text-lg text-black mb-xs">
                    {list.name}
                  </h3>
                  <p className="font-body text-sm text-dark-grey">
                    {list.itemCount} items
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedLists.includes(list.id)
                      ? 'border-white bg-green'
                      : 'border-dark-grey'
                  }`}
                >
                  {selectedLists.includes(list.id) && (
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
          ))}
        </div>

        <button
          onClick={handleSubscribe}
          disabled={selectedLists.length === 0}
          className={`font-buttons text-lg px-xl py-md rounded-full w-full transition-opacity ${
            selectedLists.length > 0
              ? 'bg-green text-white hover:opacity-90'
              : 'bg-dark-grey text-white opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
