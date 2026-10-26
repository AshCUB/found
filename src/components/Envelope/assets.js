const BASE = `${import.meta.env.BASE_URL}assets/`;

// Envelope paper color, applied to all three (neutral gray) envelope images.
// Change this one value to recolor the envelope, e.g. kraft brown is [217, 169, 114].
export const ENVELOPE_COLOR = [248, 240, 227];

export const DESK_SRC = `${BASE}desk.png`;
const ENVELOPE_IMAGES = { front: 'newfront.png', inside: 'inside.png', flap: 'tri_1.png' };

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

// Multiplies each pixel's RGB by color/255 and keeps alpha, so baked-in shadows stay shadows.
async function tint(src, [r, g, b]) {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = (px[i] * r) / 255;
    px[i + 1] = (px[i + 1] * g) / 255;
    px[i + 2] = (px[i + 2] * b) / 255;
  }
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  await loadImage(url);
  return url;
}

let assetsPromise;

// Loads the desk and tints + decodes the envelope images once per page load, so revisits are instant.
export function loadEnvelopeAssets() {
  assetsPromise ??= Promise.all([
    loadImage(DESK_SRC),
    ...Object.entries(ENVELOPE_IMAGES).map(([key, file]) =>
      tint(BASE + file, ENVELOPE_COLOR).then((url) => [key, url])
    ),
  ]).then(([, ...entries]) => Object.fromEntries(entries));
  assetsPromise.catch(() => (assetsPromise = undefined));
  return assetsPromise;
}
