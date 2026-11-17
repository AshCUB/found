// How desk images are shrunk, shared by optimize-desk-decor.mjs and import-desk-decor.mjs.
// - materials: re-encoded as WebP, at most MATERIAL_WIDTH wide (desk photos fill the screen)
// - decorations: transparent edges trimmed (so a decoration's box is the object itself, which keeps dragging inside
//   the desk accurate), then re-encoded as WebP (alpha kept), fitted within DECORATION_SIZE

// Desk photos cover the whole screen. A portrait photo is kept MATERIAL_WIDTH wide. A landscape one (e.g. wood with
// horizontal grain) is kept MATERIAL_HEIGHT tall, since a portrait phone shows its full height, and cropped to at most
// 16:9 from the center (the widest screens), since the sides beyond that are never seen.
// Decorations are drawn at most ~a third of the desk wide.
const MATERIAL_WIDTH = 1200;
const MATERIAL_HEIGHT = 1800;
const MATERIAL_MAX_RATIO = 16 / 9;
const DECORATION_SIZE = 800;

const isLandscape = ({ width, height }) => width > height;

// `fits(metadata)`: already small enough. `convert(sharpImage)`: returns the sharp pipeline that writes the WebP.
export const DESK_IMAGE_KINDS = {
  materials: {
    fits: (size) =>
      isLandscape(size)
        ? size.height <= MATERIAL_HEIGHT && size.width / size.height <= MATERIAL_MAX_RATIO + 0.01
        : size.width <= MATERIAL_WIDTH,
    convert: async (image) => {
      const size = await image.metadata();
      if (!isLandscape(size)) return image.resize({ width: MATERIAL_WIDTH, withoutEnlargement: true }).webp({ quality: 80 });
      const height = Math.min(MATERIAL_HEIGHT, size.height);
      const width = Math.min(Math.round(height * MATERIAL_MAX_RATIO), Math.round((size.width * height) / size.height));
      return image.resize({ width, height, fit: 'cover' }).webp({ quality: 80 });
    },
  },
  decorations: {
    fits: ({ width, height }) => width <= DECORATION_SIZE && height <= DECORATION_SIZE,
    convert: (image) =>
      image
        .trim()
        .resize({ width: DECORATION_SIZE, height: DECORATION_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 90 }),
  },
};
