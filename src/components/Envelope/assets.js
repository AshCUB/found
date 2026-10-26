const BASE = `${import.meta.env.BASE_URL}assets/`;

const ENVELOPE_IMAGES = {
  front: 'envelope-front.png',
  back: 'envelope-back.png',
  pocket: 'envelope-pocket.png',
  flap: 'envelope-flap.png',
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img.decode();
}

let assetsPromise;

// Loads and decodes the envelope images once per page load, so the sequence never flashes and revisits are instant.
export function loadEnvelopeAssets() {
  const srcs = Object.fromEntries(Object.entries(ENVELOPE_IMAGES).map(([key, file]) => [key, BASE + file]));
  assetsPromise ??= Promise.all(Object.values(srcs).map(loadImage)).then(() => srcs);
  assetsPromise.catch(() => (assetsPromise = undefined));
  return assetsPromise;
}
