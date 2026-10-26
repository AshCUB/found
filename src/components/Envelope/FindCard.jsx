import { useState } from 'react';
import { focusLists } from '../../data/focusLists';
import { isFittedImage } from '../ItemImage';

const formatDate = (date) => date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

// The card inside the envelope: a daily find's photo, name, description, list and date.
// Tapping anywhere on the card moves on to the next find when there's more than one.
export default function FindCard({ find, onNext, interactive, cardRef, className = '', style }) {
  const [brokenImage, setBrokenImage] = useState(null);
  const list = focusLists.find((l) => l.id === find?.listId);
  const item = find?.item;
  const image = item?.image || list?.image;
  const showImage = image && brokenImage !== image;

  const photo = showImage ? (
    <img
      key={image}
      src={image}
      alt={item.name}
      decoding="async"
      className={isFittedImage(image) ? 'find-card__image is-fitted' : 'find-card__image'}
      onError={() => setBrokenImage(image)}
    />
  ) : (
    <span className="find-card__image-placeholder font-body">{item ? 'Image' : ''}</span>
  );

  const handleKey = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onNext();
  };

  return (
    <div
      ref={cardRef}
      className={`envelope__card find-card ${className}`}
      style={style}
      aria-hidden={!interactive}
      role={onNext ? 'button' : undefined}
      tabIndex={onNext && interactive ? 0 : undefined}
      aria-roledescription={onNext ? 'card, tap for the next find' : undefined}
      onClick={onNext ?? undefined}
      onKeyDown={onNext ? handleKey : undefined}
    >
      <div className="find-card__photo">{photo}</div>
      <h2 className="find-card__name font-primary">{item?.name ?? 'No finds today'}</h2>
      <p className="find-card__description font-body">{item?.fact ?? 'Add a list to get your daily finds.'}</p>
      <div className="find-card__meta font-body">
        <span>{formatDate(new Date())}</span>
        <span>{list?.name.toLowerCase()}</span>
      </div>
    </div>
  );
}
