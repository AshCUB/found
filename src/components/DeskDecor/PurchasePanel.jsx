import { useEffect } from 'react';

// Confirms buying a decoration: its picture, description and price, with Buy / Not now (Buy is greyed out with
// "Not enough points" if the balance is short). Escape or tapping outside closes it (unless a purchase is in progress).
export default function PurchasePanel({ decoration, balance, buying, error, onBuy, onClose }) {
  const short = balance < decoration.price;

  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-md animate-fade-in"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm bg-white rounded-lg shadow-sm overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-panel-title"
      >
        <div className="relative aspect-[4/3] bg-grey">
          <img
            src={decoration.image}
            alt=""
            draggable="false"
            className="absolute inset-0 w-full h-full object-contain p-lg"
          />
          <span className="absolute top-sm right-sm bg-white/90 rounded-full px-sm py-xs font-body text-xs text-dark-grey">
            {decoration.category}
          </span>
        </div>

        <div className="p-md">
          <h2 id="purchase-panel-title" className="font-primary text-xl text-green mb-xs">
            {decoration.name}
          </h2>
          {decoration.description && <p className="font-body text-xs text-dark-grey mb-md">{decoration.description}</p>}

          <div className="flex items-baseline justify-between font-body text-xs text-dark-grey border-t border-grey pt-sm mb-md">
            <span>
              Costs <span className="text-black">{decoration.price} points</span>
            </span>
            <span>
              You have {balance} {balance === 1 ? 'point' : 'points'}
            </span>
          </div>

          {error && (
            <p className="font-body text-xs text-black mb-sm" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onBuy}
            disabled={buying || short}
            autoFocus={!short}
            className={`font-buttons text-lg px-xl py-md rounded-full w-full transition-colors ${
              short ? 'bg-grey text-dark-grey' : 'bg-green text-white hover:bg-black disabled:opacity-50'
            }`}
          >
            {short ? 'Not enough points' : buying ? 'Buying…' : `Buy for ${decoration.price} points`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={buying}
            autoFocus={short}
            className="font-buttons text-sm text-dark-grey hover:text-black transition-colors w-full mt-sm py-sm disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
