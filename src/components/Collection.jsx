import { useState, useMemo, useEffect } from 'react';
import { focusLists, visibleFocusLists } from '../data/focusLists';
import { useSignedPhotoUrls } from '../hooks/useSignedPhotoUrls';
import { formatDayLabel, toDateKey } from '../utils/date';
import ItemImage from './ItemImage';

const PhotoIcon = () => (
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
);

const smallButton = 'font-buttons text-xs text-dark-grey hover:text-green transition-colors disabled:opacity-50';

// Edit-note and delete controls for one find. Changes are saved to the account before the card updates.
function CaptureActions({ capture, itemName, onUpdateNote, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      console.error('Error updating find:', e.cause ?? e);
      setError(e.message || 'something went wrong. try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (await run(() => onUpdateNote(capture.id, note.trim() || null))) setEditing(false);
  };

  const remove = () => {
    if (window.confirm(`Delete ${itemName} from your collection? This can't be undone.`)) run(() => onDelete(capture.id));
  };

  return (
    <div className="mt-xs">
      {editing ? (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a short note..."
            className="w-full p-sm rounded-lg border-2 border-grey font-body text-xs text-black focus:border-green focus:outline-none resize-none"
            rows={2}
            maxLength={100}
            autoFocus
          />
          <div className="flex gap-md">
            <button onClick={saveNote} disabled={busy} className={smallButton}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} disabled={busy} className={smallButton}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-md">
          <button
            onClick={() => {
              setNote(capture.note || '');
              setError(null);
              setEditing(true);
            }}
            disabled={busy}
            className={smallButton}
          >
            Edit note
          </button>
          <button onClick={remove} disabled={busy} className={smallButton}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
      {error && (
        <p className="font-body text-xs text-dark-grey mt-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Full-screen view of one find's photo. Shows the thumbnail until the full-size photo has loaded.
function PhotoViewer({ capture, title, subtitle, thumbUrl, onClose }) {
  const path = capture.photoPath ?? capture.thumbPath;
  const { urls } = useSignedPhotoUrls([path]);
  const src = urls[path] ?? thumbUrl;

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="flex justify-end p-lg">
        <button onClick={onClose} className="font-buttons text-sm text-white hover:opacity-80 transition-opacity" autoFocus>
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-lg">
        {src && (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <div className="p-lg text-center max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
        <p className="font-primary text-xl text-white mb-xs">{title}</p>
        <p className="font-body text-xs text-white/70">{subtitle}</p>
        {capture.note && (
          <p className="font-body text-sm text-white italic mt-sm">"{capture.note}"</p>
        )}
      </div>
    </div>
  );
}

export default function Collection({
  captures,
  subscribedLists,
  onUpdateNote,
  onDelete,
  onClose,
}) {
  const [filterListId, setFilterListId] = useState('all');
  const [viewing, setViewing] = useState(null);

  const filteredCaptures = useMemo(() => {
    if (filterListId === 'all') {
      return [...captures].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return captures
      .filter((c) => c.listId === filterListId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [captures, filterListId]);

  // Finds grouped by the day they were found, newest first.
  const groups = useMemo(() => {
    const result = [];
    filteredCaptures.forEach((capture) => {
      const key = toDateKey(capture.date);
      const last = result[result.length - 1];
      if (last?.key === key) last.captures.push(capture);
      else result.push({ key, label: formatDayLabel(capture.date), captures: [capture] });
    });
    return result;
  }, [filteredCaptures]);

  const listCount = new Set(captures.map((c) => c.listId)).size;

  // Only the small thumbnails are needed here, signed in one batch.
  const photos = useSignedPhotoUrls(filteredCaptures.map((c) => c.thumbPath).filter(Boolean));

  const getItemName = (listId, itemId) => {
    const list = focusLists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    return item?.name || 'Unknown';
  };

  const getItemImage = (listId, itemId) => {
    const list = focusLists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    return item?.image || null;
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

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const filterLists = visibleFocusLists.filter(
    (list) => subscribedLists.includes(list.id) || captures.some((c) => c.listId === list.id)
  );

  const chipClass = (active) =>
    `font-buttons text-sm px-md py-sm rounded-full whitespace-nowrap transition-colors border-2 ${
      active ? 'bg-green text-white border-green' : 'bg-white text-dark-grey border-transparent hover:border-green'
    }`;

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

        <h1 className="font-primary text-3xl text-green mb-xs">
          Collection
        </h1>
        <p className="font-body text-sm text-dark-grey mb-md">
          {captures.length === 0
            ? 'Everything you find will be kept here.'
            : `${captures.length} ${captures.length === 1 ? 'find' : 'finds'} across ${listCount} ${listCount === 1 ? 'list' : 'lists'}`}
        </p>

        {/* Filter */}
        {captures.length > 0 && filterLists.length > 1 && (
          <div className="flex gap-xs overflow-x-auto pb-md">
            <button onClick={() => setFilterListId('all')} aria-pressed={filterListId === 'all'} className={chipClass(filterListId === 'all')}>
              All
            </button>
            {filterLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setFilterListId(list.id)}
                aria-pressed={filterListId === list.id}
                className={chipClass(filterListId === list.id)}
              >
                {list.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Captures List */}
      <div className="px-lg max-w-md mx-auto">
        {filteredCaptures.length === 0 ? (
          <div className="bg-white p-lg rounded-lg text-center shadow-sm">
            <p className="font-body text-sm text-dark-grey">
              {captures.length === 0
                ? "Nothing here yet. Open one of today's finds to make your first capture."
                : `Nothing found from ${getListName(filterListId)} yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-lg">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="font-buttons text-sm text-dark-grey mb-sm">{group.label}</h2>
                <div className="space-y-md">
                  {group.captures.map((capture) => {
                    const itemName = getItemName(capture.listId, capture.itemId);
                    const thumbUrl = photos.urls[capture.thumbPath];
                    return (
                      <div
                        key={capture.id}
                        className="bg-white p-md rounded-lg shadow-sm"
                      >
                        <div className="flex gap-md">
                          {capture.thumbPath ? (
                            <button
                              onClick={() => setViewing(capture)}
                              disabled={!thumbUrl && photos.failed}
                              aria-label={`View photo of ${itemName}`}
                              className={`w-20 h-20 rounded-lg bg-grey flex-shrink-0 overflow-hidden flex items-center justify-center hover:opacity-90 transition-opacity ${
                                thumbUrl || photos.failed ? '' : 'animate-pulse'
                              }`}
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={itemName}
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              ) : photos.failed ? (
                                <PhotoIcon />
                              ) : (
                                <span className="sr-only">loading photo…</span>
                              )}
                            </button>
                          ) : (
                            <ItemImage
                              src={getItemImage(capture.listId, capture.itemId)}
                              alt={itemName}
                              fitPadding="p-sm"
                              className="w-20 h-20 rounded-lg"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-buttons text-sm text-dark-grey mb-xs">
                              {getListName(capture.listId)}
                            </p>
                            <h3 className="font-primary text-lg text-black mb-xs">
                              {itemName}
                            </h3>
                            <p className="font-body text-xs text-dark-grey mb-xs">
                              {formatTime(capture.date)}
                              {capture.foundWithoutPhoto && ' · found without photo'}
                            </p>
                            {capture.note && (
                              <p className="font-body text-xs text-dark-grey italic">
                                "{capture.note}"
                              </p>
                            )}
                            <CaptureActions
                              capture={capture}
                              itemName={itemName}
                              onUpdateNote={onUpdateNote}
                              onDelete={onDelete}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <PhotoViewer
          capture={viewing}
          title={getItemName(viewing.listId, viewing.itemId)}
          subtitle={`${getListName(viewing.listId)} · ${formatDate(viewing.date)}`}
          thumbUrl={photos.urls[viewing.thumbPath]}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
