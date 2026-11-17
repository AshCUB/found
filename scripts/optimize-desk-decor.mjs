#!/usr/bin/env node

/**
 * Desk Decor Image Optimizer
 * - public/images/desk/materials and public/images/desk/decorations, shrunk as in desk-decor-images.mjs
 * - Keeps file names (and so every path in src/data/deskDecor.js) unchanged
 *
 * Idempotent: images that are already WebP and within size are skipped.
 * Run after adding or replacing desk images: npm run optimize-desk-decor
 * (npm run import-desk-decor already does this for the images it imports.)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { DESK_IMAGE_KINDS } from './desk-decor-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESK_DIR = join(__dirname, '..', 'public/images/desk');
const RASTER_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

async function main() {
  let before = 0;
  let after = 0;
  let converted = 0;
  let total = 0;

  for (const [name, kind] of Object.entries(DESK_IMAGE_KINDS)) {
    const dir = join(DESK_DIR, name);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => RASTER_EXTENSIONS.has(extname(f).toLowerCase()));
    total += files.length;

    for (const file of files) {
      const path = join(dir, file);
      const input = readFileSync(path);
      if (input.length === 0) {
        console.warn(`  ⚠ ${name}/${file}: empty file, skipped`);
        continue;
      }
      before += input.length;

      const metadata = await sharp(input).metadata();
      if (metadata.format === 'webp' && kind.fits(metadata)) {
        after += input.length;
        continue;
      }

      const output = await (await kind.convert(sharp(input).rotate())).toBuffer();
      writeFileSync(path, output);
      after += output.length;
      converted++;
      console.log(
        `  ✓ ${name}/${file}: ${metadata.format} ${metadata.width}x${metadata.height} ${Math.round(input.length / 1024)} KB → ${Math.round(output.length / 1024)} KB`
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
