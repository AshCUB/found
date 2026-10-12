#!/usr/bin/env node

/**
 * Verify all image paths in focusLists.js exist on disk
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');

// Load focus lists
const content = readFileSync(DATA_FILE, 'utf-8');
const match = content.match(/export const focusLists = (\[[\s\S]*\]);/);
// eslint-disable-next-line no-eval
const focusLists = eval(match[1]);

let missingImages = [];
let totalImages = 0;

for (const category of focusLists) {
  // Check cover image
  if (category.image) {
    totalImages++;
    const coverPath = join(ROOT_DIR, 'public', category.image);
    if (!existsSync(coverPath)) {
      missingImages.push({
        type: 'cover',
        category: category.name,
        path: category.image,
      });
    }
  }

  // Check item images
  for (const item of category.items) {
    if (item.image) {
      totalImages++;
      const itemPath = join(ROOT_DIR, 'public', item.image);
      if (!existsSync(itemPath)) {
        missingImages.push({
          type: 'item',
          category: category.name,
          item: item.name,
          path: item.image,
        });
      }
    }
  }
}

console.log(`Total images referenced: ${totalImages}`);
console.log(`Missing images: ${missingImages.length}`);

if (missingImages.length > 0) {
  console.log('\nMissing images:');
  for (const missing of missingImages) {
    if (missing.type === 'cover') {
      console.log(`  - ${missing.category} cover: ${missing.path}`);
    } else {
      console.log(`  - ${missing.category} / ${missing.item}: ${missing.path}`);
    }
  }
  process.exit(1);
} else {
  console.log('\n✓ All image paths exist!');
}
