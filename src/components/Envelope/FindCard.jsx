import { useState } from 'react';
import { focusLists } from '../../data/focusLists';
import { isFittedImage } from '../ItemImage';
import { formatNumericDate } from '../../utils/date';

// The card inside the envelope: a daily find's photo, name, description, list and date.
// While it's being swiped, `swipe` ({ direction, label, progress }) overlays the card with what the swipe will do.
export default function FindCard({ find, interactive, cardRef, className = '', style, swipe, handlers }) {
  const [brokenImage, setBrokenImage] = useState(null);
  const list = focusLists.find((l) => l.id === find?.listId);
  const item = find?.item;
  const image = item?.image || list?.image;
  const showImage = image && brokenImage !== image;

  return (
    <div
      ref={cardRef}
      className={`envelope__card find-card ${handlers ? 'is-draggable' : ''} ${className}`}
      style={style}
      aria-hidden={!interactive}
      tabIndex={handlers ? 0 : undefined}
      aria-keyshortcuts={handlers ? 'ArrowLeft ArrowRight' : undefined}
      {...handlers}
    >
      <div className="find-card__photo">
        {showImage ? (
          <img
            key={image}
            src={image}
            alt={item.name}
            decoding="async"
            draggable="false"
            className={isFittedImage(image) ? 'find-card__image is-fitted' : 'find-card__image'}
            onError={() => setBrokenImage(image)}
          />
        ) : (
          <span className="find-card__image-placeholder font-body">{item ? 'Image' : ''}</span>
        )}
      </div>
      <h2 className="find-card__name font-primary">{item?.name ?? 'No finds today'}</h2>
      <p className="find-card__description font-body">{item?.fact ?? 'Add a list to get your daily finds.'}</p>
      <div className="find-card__meta font-body">
        <span>{formatNumericDate()}</span>
        <span>{list?.name.toLowerCase()}</span>
      </div>
      {swipe && (
        <div className={`find-card__swipe is-${swipe.direction}`} style={{ opacity: swipe.progress }}>
          <span className="font-primary">{swipe.label}</span>
        </div>
      )}
    </div>
  );
}
