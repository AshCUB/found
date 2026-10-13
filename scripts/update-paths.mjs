#!/usr/bin/env node

/**
 * Update focusLists.js to replace .svg with .webp for image paths
 * Also converts absolute paths to relative paths for Vite base path compatibility
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');

const content = readFileSync(DATA_FILE, 'utf-8');
// Replace .svg with .webp but keep moon-phases-cover.svg as is (it's from the old data)
let updated = content.replace(/image: '\/images\/(?!moon-phases)[^']+\.svg'/g, (match) => match.replace('.svg', '.webp'));
// Convert absolute paths (/images/) to relative paths (images/) for Vite base path compatibility
updated = updated.replace(/image: '\/images\//g, "image: 'images/");

writeFileSync(DATA_FILE, updated);
console.log('Updated focusLists.js: replaced .svg with .webp and converted to relative paths');
