#!/usr/bin/env node

/**
 * Desk Decor Image Optimizer
 * - public/images/desk/materials: re-encoded as WebP, at most MATERIAL_WIDTH wide (desk photos fill the screen)
 * - public/images/desk/decorations: transparent edges trimmed (so a decoration's box is the object itself, which keeps
 *   dragging inside the desk accurate), then re-encoded as WebP (alpha kept), fitted within DECORATION_SIZE
 * - Keeps file names (and so every path in src/data/deskDecor.js) unchanged
 *
 * Idempotent: images that are already WebP and within size are skipped.
 * Run after adding or replacing desk images: npm run optimize-desk-decor
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESK_DIR = join(__dirname, '..', 'public/images/desk');
const RASTER_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

// Desk photos cover the whole screen. A portrait photo is kept MATERIAL_WIDTH wide. A landscape one (e.g. wood with
// horizontal grain) is kept MATERIAL_HEIGHT tall, since a portrait phone shows its full height, and cropped to at most
// 16:9 from the center (the widest screens), since the sides beyond that are never seen.
// Decorations are drawn at most ~a third of the desk wide.
const MATERIAL_WIDTH = 1200;
const MATERIAL_HEIGHT = 1800;
const MATERIAL_MAX_RATIO = 16 / 9;
const DECORATION_SIZE = 800;

const isLandscape = ({ width, height }) => width > height;

const FOLDERS = [
  {
    name: 'materials',
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
  {
    name: 'decorations',
    fits: ({ width, height }) => width <= DECORATION_SIZE && height <= DECORATION_SIZE,
    convert: (image) =>
      image
        .trim()
        .resize({ width: DECORATION_SIZE, height: DECORATION_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 90 }),
  },
];

async function main() {
  let before = 0;
  let after = 0;
  let converted = 0;
  let total = 0;

  for (const folder of FOLDERS) {
    const dir = join(DESK_DIR, folder.name);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => RASTER_EXTENSIONS.has(extname(f).toLowerCase()));
    total += files.length;

    for (const file of files) {
      const path = join(dir, file);
      const input = readFileSync(path);
      if (input.length === 0) {
        console.warn(`  ⚠ ${folder.name}/${file}: empty file, skipped`);
        continue;
      }
      before += input.length;

      const metadata = await sharp(input).metadata();
      if (metadata.format === 'webp' && folder.fits(metadata)) {
        after += input.length;
        continue;
      }

      const output = await (await folder.convert(sharp(input).rotate())).toBuffer();
      writeFileSync(path, output);
      after += output.length;
      converted++;
      console.log(
        `  ✓ ${folder.name}/${file}: ${metadata.format} ${metadata.width}x${metadata.height} ${Math.round(input.length / 1024)} KB → ${Math.round(output.length / 1024)} KB`
      );
    }
  }

  console.log(`\nConverted ${converted}/${total} images`);
  console.log(`Total: ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
