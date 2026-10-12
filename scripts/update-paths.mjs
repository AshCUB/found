#!/usr/bin/env node

/**
 * Update focusLists.js to replace .svg with .webp for image paths
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');

const content = readFileSync(DATA_FILE, 'utf-8');
// Replace .svg with .webp but keep moon-phases-cover.svg as is (it's from the old data)
const updated = content.replace(/image: '\/images\/(?!moon-phases)[^']+\.svg'/g, (match) => match.replace('.svg', '.webp'));

writeFileSync(DATA_FILE, updated);
console.log('Updated focusLists.js: replaced .svg with .webp (except moon-phases-cover.svg)');
