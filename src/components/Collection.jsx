import { useState, useMemo, useEffect, useRef } from 'react';
import { focusLists, visibleFocusLists } from '../data/focusLists';
import { useSignedPhotoUrls } from '../hooks/useSignedPhotoUrls';
import { formatDayLabel } from '../utils/date';
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

const ArrowButton = ({ direction, label, onClick }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`absolute top-1/2 -translate-y-1/2 ${
      direction === 'left' ? 'right-full mr-sm' : 'left-full ml-sm'
    } font-buttons text-2xl text-dark-grey hover:text-green transition-colors px-sm py-md`}
  >
    <span aria-hidden="true">{direction === 'left' ? '‹' : '›'}</span>
  </button>
);

const fullPhotoPath = (capture) => capture && (capture.photoPath ?? capture.thumbPath);

// One find shown as a post, with arrows, swipes and the arrow keys moving to the newer/older find.
// Shows the thumbnail until the full-size photo has loaded.
function FindDetail({ captures, index, onNavigate, onClose, thumbUrls, describe, onUpdateNote, onDelete }) {
  const capture = captures[index];
  const newer = captures[index - 1];
  const older = captures[index + 1];
  const { urls, failed } = useSignedPhotoUrls([capture, newer, older].map(fullPhotoPath).filter(Boolean));
  const src = urls[fullPhotoPath(capture)] ?? thumbUrls[capture.thumbPath];
  const { itemName, listName, itemImage } = describe(capture);
  const scrollRef = useRef(null);
  const touchStart = useRef(null);

  const goNewer = () => newer && onNavigate(index - 1);
  const goOlder = () => older && onNavigate(index + 1);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.closest?.('textarea, input')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goNewer();
      else if (e.key === 'ArrowRight') goOlder();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [capture.id]);

  // Load the neighbouring photos ahead of time so moving between finds feels instant.
  useEffect(() => {
    [newer, older].forEach((c) => {
      const url = urls[fullPhotoPath(c)];
      if (url) new Image().src = url;
    });
  }, [urls, newer, older]);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(t.clientY - start.y)) return;
    if (dx < 0) goOlder();
    else goNewer();
  };

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-grey overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={itemName}
    >
      <div className="max-w-md min-h-full mx-auto flex flex-col px-md pt-lg pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-md">
          <button
            onClick={onClose}
            className="font-buttons text-sm text-dark-grey hover:text-green transition-colors"
            autoFocus
          >
            ← Collection
          </button>
          <span className="font-body text-xs text-dark-grey">
            {index + 1} of {captures.length}
          </span>
        </div>

        <article className="bg-white rounded-lg shadow-sm mx-lg my-auto">
          <p className="font-buttons text-sm text-dark-grey px-md py-sm">{listName}</p>
          <div
            className="relative aspect-[4/5] bg-grey select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {capture.thumbPath ? (
              src ? (
                <img key={capture.id} src={src} alt={itemName} className="w-full h-full object-cover" />
              ) : (
                <div className={`absolute inset-0 flex items-center justify-center ${failed ? '' : 'animate-pulse'}`}>
                  {failed ? <PhotoIcon /> : <span className="sr-only">loading photo…</span>}
                </div>
              )
            ) : (
              <ItemImage key={capture.id} src={itemImage} alt={itemName} fitPadding="p-xl" className="w-full h-full" />
            )}
            {newer && <ArrowButton direction="left" label="Newer find" onClick={goNewer} />}
            {older && <ArrowButton direction="right" label="Older find" onClick={goOlder} />}
          </div>
          <div className="p-md">
            <h2 className="font-primary text-xl text-green mb-xs">{itemName}</h2>
            <p className="font-body text-xs text-dark-grey">
              {formatDayLabel(capture.date)} · {formatTime(capture.date)}
              {capture.foundWithoutPhoto && ' · found without photo'}
            </p>
            {capture.note && (
              <p className="font-body text-sm text-dark-grey italic mt-sm">"{capture.note}"</p>
            )}
            <CaptureActions
              key={capture.id}
              capture={capture}
              itemName={itemName}
              onUpdateNote={onUpdateNote}
              onDelete={onDelete}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

const formatTime = (dateString) =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

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

  // Kept in range when the open find is deleted; closes once nothing is left.
  const viewingIndex = viewing === null ? -1 : Math.min(viewing, filteredCaptures.length - 1);

  const listCount = new Set(captures.map((c) => c.listId)).size;

  // Only the small thumbnails are needed here, signed in one batch.
  const photos = useSignedPhotoUrls(filteredCaptures.map((c) => c.thumbPath).filter(Boolean));

  const getListName = (listId) => {
    const list = focusLists.find((l) => l.id === listId);
    return list?.name || 'Unknown';
  };

  const describe = (capture) => {
    const list = focusLists.find((l) => l.id === capture.listId);
    const item = list?.items.find((i) => i.id === capture.itemId);
    return { itemName: item?.name || 'Unknown', listName: list?.name || 'Unknown', itemImage: item?.image || null };
  };

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
          <div className="grid grid-cols-3 gap-[2px] rounded-lg overflow-hidden">
            {filteredCaptures.map((capture, i) => {
              const { itemName, itemImage } = describe(capture);
              const thumbUrl = photos.urls[capture.thumbPath];
              return (
                <button
                  key={capture.id}
                  onClick={() => setViewing(i)}
                  aria-label={`${itemName}, ${formatDayLabel(capture.date)}`}
                  className="relative aspect-square bg-grey overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {!capture.thumbPath ? (
                    <ItemImage src={itemImage} alt="" fitPadding="p-sm" className="w-full h-full" />
                  ) : thumbUrl ? (
                    <img src={thumbUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className={`absolute inset-0 flex items-center justify-center bg-white ${photos.failed ? '' : 'animate-pulse'}`}
                    >
                      {photos.failed && <PhotoIcon />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {viewingIndex >= 0 && (
        <FindDetail
          captures={filteredCaptures}
          index={viewingIndex}
          onNavigate={setViewing}
          onClose={() => setViewing(null)}
          thumbUrls={photos.urls}
          describe={describe}
          onUpdateNote={onUpdateNote}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
