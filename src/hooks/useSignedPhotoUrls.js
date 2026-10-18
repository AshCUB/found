import { useEffect, useState } from 'react';
import { getSignedPhotoUrls } from '../services/userData';

// Signed URLs for private photo paths, requested in one batch. urls[path] is undefined while loading;
// failed is true if signing failed (e.g. offline).
export function useSignedPhotoUrls(paths) {
  const [state, setState] = useState({ urls: {}, failed: false });
  const key = [...new Set(paths)].sort().join('|');

  useEffect(() => {
    if (!key) return;
    let active = true;
    getSignedPhotoUrls(key.split('|')).then(
      (urls) => active && setState((s) => ({ urls: { ...s.urls, ...urls }, failed: false })),
      (error) => {
        console.error('Error loading photos:', error.cause ?? error);
        if (active) setState((s) => ({ ...s, failed: true }));
      },
    );
    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
