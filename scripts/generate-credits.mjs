#!/usr/bin/env node

/**
 * Generate CREDITS.md from imageCredits.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CREDITS_FILE = join(ROOT_DIR, 'src/data/imageCredits.json');
const FOCUS_LISTS_FILE = join(ROOT_DIR, 'src/data/focusLists.js');
const OUTPUT_FILE = join(ROOT_DIR, 'CREDITS.md');

// Load credits
const credits = JSON.parse(readFileSync(CREDITS_FILE, 'utf-8'));

// Load focus lists to get category names
const focusListsContent = readFileSync(FOCUS_LISTS_FILE, 'utf-8');
const match = focusListsContent.match(/export const focusLists = (\[[\s\S]*\]);/);
// eslint-disable-next-line no-eval
const focusLists = eval(match[1]);

// Create category lookup
const categoryMap = {};
for (const category of focusLists) {
  categoryMap[category.id] = category.name;
}

// Group credits by category
const byCategory = {};
for (const [id, credit] of Object.entries(credits)) {
  // Determine category from the item's prefix
  let categoryId = 'other';
  if (id.startsWith('color-')) categoryId = 'colors';
  else if (id.startsWith('shape-')) categoryId = 'shapes';
  else if (id.startsWith('texture-')) categoryId = 'textures';
  else if (id.startsWith('pattern-')) categoryId = 'patterns';
  else if (id.startsWith('letter-') || id.startsWith('number-')) categoryId = 'letters-numbers';
  else if (id.startsWith('material-')) categoryId = 'materials';
  else if (id.startsWith('plant-')) categoryId = 'plants-trees';
  else if (id.startsWith('sign-')) categoryId = 'signs-symbols';
  else if (id.startsWith('perspective-')) categoryId = 'perspective';
  else if (id.includes('-cover')) {
    // Cover images - extract category from the ID
    if (id === 'colors-cover') categoryId = 'colors';
    else if (id === 'shapes-cover') categoryId = 'shapes';
    else if (id === 'textures-cover') categoryId = 'textures';
    else if (id === 'patterns-cover') categoryId = 'patterns';
    else if (id === 'letters-numbers-cover') categoryId = 'letters-numbers';
    else if (id === 'materials-cover') categoryId = 'materials';
    else if (id === 'plants-trees-cover') categoryId = 'plants-trees';
    else if (id === 'signs-symbols-cover') categoryId = 'signs-symbols';
    else if (id === 'perspective-cover') categoryId = 'perspective';
  }

  if (!byCategory[categoryId]) {
    byCategory[categoryId] = [];
  }
  byCategory[categoryId].push(credit);
}

// Remove the "other" category by redistributing its items based on localPath
if (byCategory['other']) {
  const otherItems = byCategory['other'];
  delete byCategory['other'];

  for (const item of otherItems) {
    let categoryId = 'other';
    const path = item.localPath;

    if (path.includes('/color-')) categoryId = 'colors';
    else if (path.includes('/shape-')) categoryId = 'shapes';
    else if (path.includes('/texture-')) categoryId = 'textures';
    else if (path.includes('/pattern-')) categoryId = 'patterns';
    else if (path.includes('/letter-') || path.includes('/number-')) categoryId = 'letters-numbers';
    else if (path.includes('/material-')) categoryId = 'materials';
    else if (path.includes('/plant-')) categoryId = 'plants-trees';
    else if (path.includes('/sign-')) categoryId = 'signs-symbols';
    else if (path.includes('/perspective-')) categoryId = 'perspective';
    else if (path.includes('-cover')) {
      if (path.includes('colors-')) categoryId = 'colors';
      else if (path.includes('shapes-')) categoryId = 'shapes';
      else if (path.includes('textures-')) categoryId = 'textures';
      else if (path.includes('patterns-')) categoryId = 'patterns';
      else if (path.includes('letters-numbers-')) categoryId = 'letters-numbers';
      else if (path.includes('materials-')) categoryId = 'materials';
      else if (path.includes('plants-trees-')) categoryId = 'plants-trees';
      else if (path.includes('signs-symbols-')) categoryId = 'signs-symbols';
      else if (path.includes('perspective-')) categoryId = 'perspective';
    }

    if (!byCategory[categoryId]) {
      byCategory[categoryId] = [];
    }
    byCategory[categoryId].push(item);
  }
}

// Sort categories alphabetically
const sortedCategories = Object.keys(byCategory).sort();

// Generate markdown
let markdown = '# Image Credits\n\n';
markdown += 'All images are sourced from free-to-use stock photo sites under licenses that permit commercial use without attribution. Attribution is provided below for transparency and to honor the photographers.\n\n';
markdown += '## License Summary\n\n';
markdown += '- **Pixabay License**: Free to use, no attribution required (but we provide it anyway)\n';
markdown += '- Images may be used for commercial purposes\n';
markdown += '- Images may be modified and adapted\n\n';

markdown += '## Credits by Category\n\n';

for (const categoryId of sortedCategories) {
  const items = byCategory[categoryId];
  const categoryName = categoryMap[categoryId] || categoryId;
  markdown += `### ${categoryName}\n\n`;
  markdown += '| Item | Photographer | Source | License |\n';
  markdown += '|------|-------------|--------|---------|\n';

  for (const item of items) {
    const photographerName = item.photographer || 'Unknown';
    const photographerLink = item.photographerUrl ? `[${photographerName}](${item.photographerUrl})` : photographerName;
    const sourceLink = `[${item.source}](${item.pageUrl})`;
    markdown += `| ${item.name} | ${photographerLink} | ${sourceLink} | ${item.license} |\n`;
  }

  markdown += '\n';
}

markdown += '---\n\n';
markdown += '*Generated automatically from src/data/imageCredits.json*\n';

// Write output
writeFileSync(OUTPUT_FILE, markdown);
console.log(`Generated ${OUTPUT_FILE}`);
