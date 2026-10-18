// Resizes and re-encodes a photo in the browser so uploads stay small (free storage tier).
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_QUALITY = 0.8;
export const THUMB_MAX_SIDE = 320;
export const THUMB_QUALITY = 0.7;

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("we couldn't read that photo. try a different one."));
    };
    img.src = url;
  });
}

function toJpeg(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  // White behind transparent images (e.g. PNGs), which would otherwise turn black as JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("we couldn't process that photo. try a different one."))),
      'image/jpeg',
      quality,
    ),
  );
}

// Returns { photo, thumb } JPEG blobs: the photo at most 1600px on the long side, the thumbnail 320px.
export async function compressPhoto(file) {
  const img = await loadImage(file);
  const [photo, thumb] = await Promise.all([
    toJpeg(img, PHOTO_MAX_SIDE, PHOTO_QUALITY),
    toJpeg(img, THUMB_MAX_SIDE, THUMB_QUALITY),
  ]);
  return { photo, thumb };
}
