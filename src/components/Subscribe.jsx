import { useState } from 'react';
import { visibleFocusLists } from '../data/focusLists';
import ItemImage from './ItemImage';

// List picker. During onboarding it picks the first lists; afterwards (adding) it only offers lists not yet selected.
export default function Subscribe({ onSubscribe, subscribedLists, adding = false, onCancel }) {
  const [selectedLists, setSelectedLists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const availableLists = adding
    ? visibleFocusLists.filter((list) => !subscribedLists.includes(list.id))
    : visibleFocusLists;

  const toggleList = (listId) => {
    setSelectedLists((prev) => {
      if (prev.includes(listId)) {
        return prev.filter((id) => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  const handleSubscribe = async () => {
    if (selectedLists.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubscribe(selectedLists);
    } catch (e) {
      console.error('Error saving lists:', e.cause ?? e);
      setError(e.message || "we couldn't save your lists. check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selectedLists.length > 0;

  return (
    <div className="min-h-screen bg-grey flex flex-col p-lg animate-fade-in">
      <div className="max-w-md w-full mx-auto">
        {adding && (
          <button
            onClick={onCancel}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
          >
            ← Back
          </button>
        )}
        <h1 className="font-primary text-3xl text-green mb-md">
          {adding ? 'Add a list' : 'Choose your first list'}
        </h1>
        <p className="font-body text-sm text-dark-grey mb-xl">
          {adding
            ? "Each list adds a new daily find. Pick as many as you'd like."
            : 'Pick one or more lists to start your journey. You can add more later.'}
        </p>

        {availableLists.length === 0 ? (
          <div className="bg-white p-lg rounded-lg text-center shadow-sm">
            <p className="font-body text-sm text-dark-grey mb-md">
              You've added every list. More are on the way.
            </p>
            <button
              onClick={onCancel}
              className="font-buttons text-sm bg-green text-white px-lg py-md rounded-full hover:opacity-90 transition-opacity"
            >
              Back to today
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-md mb-xl">
              {availableLists.map((list) => {
                const selected = selectedLists.includes(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => toggleList(list.id)}
                    aria-pressed={selected}
                    className={`w-full text-left p-md rounded-lg transition-all ${
                      selected
                        ? 'bg-green border-2 border-green'
                        : 'bg-white border-2 border-transparent hover:border-green'
                    }`}
                  >
                    <div className="flex items-center gap-md">
                      <ItemImage src={list.image} alt="" className="w-16 h-16 rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-buttons text-lg mb-xs ${selected ? 'text-white' : 'text-black'}`}>
                          {list.name}
                        </h3>
                        <p className={`font-body text-sm ${selected ? 'text-white' : 'text-dark-grey'}`}>
                          {list.description || `${list.itemCount} items`}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selected
                            ? 'border-white bg-green'
                            : 'border-dark-grey'
                        }`}
                      >
                        {selected && (
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
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="font-body text-sm text-dark-grey text-center mb-md" role="alert">
                {error}
              </p>
            )}
            <button
              onClick={handleSubscribe}
              disabled={!canContinue || saving}
              className={`font-buttons text-lg px-xl py-md rounded-full w-full transition-opacity ${
                canContinue
                  ? `bg-green text-white ${saving ? 'opacity-50 cursor-wait' : 'hover:opacity-90'}`
                  : 'bg-dark-grey text-white opacity-50 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving…' : adding && canContinue ? `Add ${selectedLists.length === 1 ? 'list' : `${selectedLists.length} lists`}` : 'Continue'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
