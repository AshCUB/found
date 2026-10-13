#!/usr/bin/env node

/**
 * Image Optimizer
 * - Re-encodes every raster image in public/images as a real WebP, resized to MAX_WIDTH
 * - Keeps file names (and so every path in focusLists.js) unchanged
 *
 * Idempotent: images that are already WebP and within MAX_WIDTH are skipped.
 * Run after fetching or replacing photos.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public/images');
const RASTER_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

// Largest display box is ~400 CSS px wide; 800 covers 2x screens
const MAX_WIDTH = 800;
const QUALITY = 75;

async function main() {
  let before = 0;
  let after = 0;
  let converted = 0;
  const files = readdirSync(IMAGES_DIR).filter((f) => RASTER_EXTENSIONS.has(extname(f).toLowerCase()));

  for (const file of files) {
    const path = join(IMAGES_DIR, file);
    const input = readFileSync(path);
    if (input.length === 0) {
      console.warn(`  ⚠ ${file}: empty file, skipped`);
      continue;
    }
    before += input.length;

    const { format, width } = await sharp(input).metadata();
    if (format === 'webp' && width <= MAX_WIDTH) {
      after += input.length;
      continue;
    }

    const output = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    writeFileSync(path, output);
    after += output.length;
    converted++;
    console.log(`  ✓ ${file}: ${format} ${width}px ${Math.round(input.length / 1024)} KB → ${Math.round(output.length / 1024)} KB`);
  }

  console.log(`\nConverted ${converted}/${files.length} images`);
  console.log(`Total: ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
