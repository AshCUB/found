import { useEffect, useMemo, useState } from 'react';

export default function Capture({
  dailyFind,
  onSave,
  onCancel,
  onDone,
}) {
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // One preview URL per chosen photo, released when it changes or the screen closes.
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
    }
    // Lets the same file be picked again after removing it.
    e.target.value = '';
  };

  // Only confirms once the find is saved to the account; on failure the photo and note stay so the user can retry.
  const save = async (savePhoto, foundWithoutPhoto) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(dailyFind, savePhoto, note || null, foundWithoutPhoto);
      setShowConfirmation(true);
    } catch (e) {
      console.error('Error saving capture:', e.cause ?? e);
      setError(e.message || "we couldn't save your find. check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!saving && (photo || note.trim())) save(photo, false);
  };

  const handleMarkWithoutPhoto = () => {
    if (!saving) save(null, true);
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-grey z-50 flex items-center justify-center p-lg animate-fade-in overflow-y-auto">
        <div className="bg-white p-lg rounded-lg shadow-sm max-w-md w-full text-center">
          {previewUrl ? (
            <div className="relative w-32 h-32 mx-auto mb-lg">
              <img src={previewUrl} alt={dailyFind.item.name} className="w-full h-full object-cover rounded-lg" />
              <div className="absolute -bottom-sm -right-sm w-8 h-8 rounded-full bg-green border-2 border-white flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-lg">
              <svg
                className="w-8 h-8 text-green"
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
            </div>
          )}
          <p className="font-buttons text-base text-dark-grey mb-xs">{dailyFind.item.name}</p>
          <h3 className="font-primary text-2xl text-green mb-md">
            Added to your collection
          </h3>
          <p className="font-body text-sm text-dark-grey mb-lg">
            Now take a breath and look up.
          </p>
          <button
            onClick={onDone}
            autoFocus
            className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-grey z-50 animate-fade-in overflow-y-auto">
      {/* Header */}
      <div className="p-lg">
        <button
          onClick={onCancel}
          className="font-buttons text-sm text-dark-grey hover:text-green transition-colors mb-lg"
        >
          ← Cancel
        </button>
      </div>

      {/* Content */}
      <div className="px-lg pb-lg max-w-md mx-auto">
        <h2 className="font-buttons text-lg text-black mb-md">
          Capture {dailyFind.item.name}
        </h2>

        <div className="bg-white p-lg rounded-lg shadow-sm mb-lg">
          {/* Photo Input */}
          <div className="mb-lg">
            <label className="font-buttons text-sm text-black mb-md block">
              Photo
            </label>
            <div className="w-full h-48 rounded-lg bg-grey flex items-center justify-center mb-md overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex w-full h-full">
                  <label className="flex-1 flex items-center justify-center cursor-pointer hover:bg-black/5 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 text-dark-grey mx-auto mb-xs"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="font-body text-xs text-dark-grey">
                        Take photo
                      </p>
                    </div>
                  </label>
                  <div className="w-px bg-dark-grey/20 my-lg" />
                  <label className="flex-1 flex items-center justify-center cursor-pointer hover:bg-black/5 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 text-dark-grey mx-auto mb-xs"
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
                      <p className="font-body text-xs text-dark-grey">
                        Choose from library
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="font-buttons text-xs text-dark-grey hover:text-green transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Note Input */}
          <div className="mb-lg">
            <label className="font-buttons text-sm text-black mb-md block">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a short note..."
              className="w-full p-md rounded-lg border-2 border-grey font-body text-sm text-black focus:border-green focus:outline-none resize-none"
              rows={3}
              maxLength={100}
            />
            <p className="font-body text-xs text-dark-grey mt-xs text-right">
              {note.length}/100
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-md">
            {error && (
              <p className="font-body text-sm text-dark-grey text-center" role="alert">
                {error}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || (!photo && !note.trim())}
              className={`font-buttons text-lg px-xl py-md rounded-full w-full transition-opacity ${
                photo || note.trim()
                  ? `bg-green text-white ${saving ? 'opacity-50 cursor-wait' : 'hover:opacity-90'}`
                  : 'bg-dark-grey text-white opacity-50 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={handleMarkWithoutPhoto}
              disabled={saving}
              className="font-buttons text-sm text-dark-grey hover:text-green transition-colors w-full"
            >
              Mark as found without photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
