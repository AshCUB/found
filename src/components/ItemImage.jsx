import { useState } from 'react';

// Shape and letter/number artwork is drawn on a transparent background, so it's fitted with padding instead of cropped.
const FITTED_IMAGE = /shape-|letters-numbers\//;

export const isFittedImage = (src) => FITTED_IMAGE.test(src ?? '');

// A list or item image in a grey box, with a quiet placeholder when there's no image or it fails to load.
export default function ItemImage({ src, alt, className = '', fitPadding = 'p-xs', placeholder = 'Image' }) {
  const [broken, setBroken] = useState(null);
  const show = src && broken !== src;

  return (
    <div className={`bg-grey overflow-hidden relative flex-shrink-0 ${className}`}>
      {show ? (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${isFittedImage(src) ? `object-contain ${fitPadding}` : 'object-cover'}`}
          onError={() => setBroken(src)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-green/10">
          <span className="font-body text-xs text-dark-grey">{placeholder}</span>
        </div>
      )}
    </div>
  );
}
