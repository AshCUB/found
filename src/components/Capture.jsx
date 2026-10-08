import { useState } from 'react';

export default function Capture({
  dailyFind,
  onSave,
  onCancel,
  onMarkWithoutPhoto,
}) {
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
    }
  };

  const handleSave = () => {
    if (photo || note.trim()) {
      onSave(dailyFind, photo, note || null, false);
      setShowConfirmation(true);
    }
  };

  const handleMarkWithoutPhoto = () => {
    onSave(dailyFind, null, note || null, true);
    setShowConfirmation(true);
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-grey z-50 flex items-center justify-center p-lg animate-fade-in">
        <div className="bg-white p-lg rounded-lg shadow-sm max-w-md w-full text-center">
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
          <h3 className="font-primary text-2xl text-green mb-md">
            Added to your collection
          </h3>
          <p className="font-body text-sm text-dark-grey mb-lg">
            Now take a breath and look up.
          </p>
          <button
            onClick={onCancel}
            className="font-buttons text-lg bg-green text-white px-xl py-md rounded-full w-full hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-grey z-50 animate-fade-in">
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
              Photo (optional)
            </label>
            <div className="w-full h-48 rounded-lg bg-grey flex items-center justify-center mb-md overflow-hidden">
              {photo ? (
                <img
                  src={URL.createObjectURL(photo)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <label className="cursor-pointer">
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
                      Tap to take photo
                    </p>
                  </div>
                </label>
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
              Note (optional)
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
            <button
              onClick={handleSave}
              disabled={!photo && !note.trim()}
              className={`font-buttons text-lg px-xl py-md rounded-full w-full transition-opacity ${
                photo || note.trim()
                  ? 'bg-green text-white hover:opacity-90'
                  : 'bg-dark-grey text-white opacity-50 cursor-not-allowed'
              }`}
            >
              Save
            </button>

            <button
              onClick={handleMarkWithoutPhoto}
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
