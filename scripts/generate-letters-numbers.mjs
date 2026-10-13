#!/usr/bin/env node

/**
 * Letters and Numbers Generator
 * - Renders the literal characters named in each Letters and Numbers item as outlined SVG paths
 * - Writes public/images/letters-numbers/<item-id>.svg
 * - Points each generated item's `image` in focusLists.js at its SVG
 * - Writes the review page scripts/review/letters-numbers.html
 *
 * Idempotent: rerun after editing the list. Items whose name is a description rather than
 * literal characters are skipped and reported.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');
const FONT_FILE = join(__dirname, 'fonts/Inter-Bold.ttf');
const OUTPUT_DIR = join(ROOT_DIR, 'public/images/letters-numbers');
const REVIEW_FILE = join(__dirname, 'review/letters-numbers.html');
const LIST_ID = 'letters-numbers';

// Matches the Shapes list foreground color
const FILL = '#333';
const VIEWBOX = 200;
const CAP_HEIGHT = 110;
const MAX_WIDTH = 160;

// Gradient stops for metallic fills, plus a darker outline so they read on the grey background
const METALLIC = {
  gold: { stops: ['#F9E27D', '#D4AF37', '#A67C00', '#E8C547'], stroke: '#8A6D1A' },
  silver: { stops: ['#FAFAFA', '#C0C0C0', '#8A8A8A', '#D9D9D9'], stroke: '#666' },
};
const COLOR_FILLS = { red: '#E53935', blue: '#1E88E5' };

// "Find the number 5", "Find the letter D", "Find the letter D written in blue"
const LITERAL_PATTERN = /^Find the (?:number|letter) ([A-Za-z0-9]+)(?: written in ([a-z]+))?$/;
// "Find a letter written in gold" -> sample character to draw in that color
const ANY_LETTER_PATTERN = /^Find a letter written in (gold|silver)$/;
const SAMPLE_LETTERS = { gold: 'G', silver: 'S' };
// Descriptive items that still get a generated sample
const SAMPLE_TEXT = { 'word-starts-p': 'Park' };

function getLiteral({ id, name }) {
  if (SAMPLE_TEXT[id]) return { text: SAMPLE_TEXT[id], color: null };
  const literal = name.match(LITERAL_PATTERN);
  if (literal) return { text: literal[1], color: literal[2] ?? null };
  const anyLetter = name.match(ANY_LETTER_PATTERN);
  return anyLetter ? { text: SAMPLE_LETTERS[anyLetter[1]], color: anyLetter[1] } : null;
}
const imagePathFor = (id) => `images/letters-numbers/${id}.svg`;
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderSvg(font, text, color) {
  const capHeight = font.tables.os2.sCapHeight || font.unitsPerEm * 0.7;
  let size = (CAP_HEIGHT / capHeight) * font.unitsPerEm;

  let box = font.getPath(text, 0, 0, size).getBoundingBox();
  const width = box.x2 - box.x1;
  if (width > MAX_WIDTH) {
    size *= MAX_WIDTH / width;
    box = font.getPath(text, 0, 0, size).getBoundingBox();
  }

  const x = (VIEWBOX - (box.x2 - box.x1)) / 2 - box.x1;
  const y = (VIEWBOX - (box.y2 - box.y1)) / 2 - box.y1;
  const d = font.getPath(text, x, y, size).toPathData(2);

  const metallic = METALLIC[color];
  const defs = metallic
    ? `<defs><linearGradient id="m" x1="0" y1="0" x2="0.4" y2="1">${metallic.stops.map((c, i) => `<stop offset="${(i / (metallic.stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`
    : '';
  const paint = metallic ? `fill="url(#m)" stroke="${metallic.stroke}" stroke-width="1.5"` : `fill="${COLOR_FILLS[color] ?? FILL}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">${defs}<path ${paint} d="${d}"/></svg>\n`;
}

function updateImagePaths(generated) {
  let source = readFileSync(DATA_FILE, 'utf-8');
  for (const { id } of generated) {
    const linePattern = new RegExp(`(\\{ id: '${id}',[^\\n]*?image: ')[^']*(')`);
    source = source.replace(linePattern, `$1${imagePathFor(id)}$2`);
  }
  writeFileSync(DATA_FILE, source);
}

function writeReviewPage(generated, skipped) {
  const cards = generated.map(({ id, name, text }) => `    <div class="card">
      <img src="../../public/${imagePathFor(id)}" loading="lazy" alt="${escapeHtml(name)}">
      <div class="prompt">${escapeHtml(name)}</div>
      <div class="meta">${id} · "${escapeHtml(text)}"</div>
    </div>`).join('\n');
  const skippedRows = skipped.map(({ id, name }) => `    <li><code>${id}</code> ${escapeHtml(name)}</li>`).join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Review: Letters and Numbers</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f2f2f2; margin: 24px; color: #333; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .card { background: #fff; border-radius: 8px; padding: 12px; }
  .card img { width: 100%; aspect-ratio: 1; background: #f2f2f2; border-radius: 8px; display: block; }
  .prompt { font-weight: 600; margin-top: 8px; }
  .meta { font-size: 12px; color: #777; margin-top: 4px; }
</style></head><body>
<h1>Letters and Numbers — ${generated.length} generated, ${skipped.length} skipped</h1>
<div class="grid">
${cards}
</div>
<h2>Skipped (name is a description, not literal characters)</h2>
<ul>
${skippedRows}
</ul>
</body></html>
`;
  mkdirSync(dirname(REVIEW_FILE), { recursive: true });
  writeFileSync(REVIEW_FILE, html);
}

async function main() {
  const { focusLists } = await import(`${pathToFileURL(DATA_FILE).href}?t=${Date.now()}`);
  const list = focusLists.find((l) => l.id === LIST_ID);
  if (!list) throw new Error(`List "${LIST_ID}" not found in ${DATA_FILE}`);

  const font = opentype.loadSync(FONT_FILE);
  const generated = [];
  const skipped = [];

  for (const item of list.items) {
    const literal = getLiteral(item);
    (literal ? generated : skipped).push({ id: item.id, name: item.name, ...literal });
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const { id, text, color } of generated) {
    writeFileSync(join(OUTPUT_DIR, `${id}.svg`), renderSvg(font, text, color));
  }

  const keep = new Set(generated.map(({ id }) => `${id}.svg`));
  for (const file of readdirSync(OUTPUT_DIR)) {
    if (!keep.has(file)) {
      unlinkSync(join(OUTPUT_DIR, file));
      console.log(`  removed stale ${file}`);
    }
  }

  updateImagePaths(generated);
  writeReviewPage(generated, skipped);

  const missing = generated.filter(({ id }) => !existsSync(join(OUTPUT_DIR, `${id}.svg`)));
  if (missing.length) throw new Error(`Missing output for: ${missing.map((m) => m.id).join(', ')}`);

  console.log(`Generated ${generated.length} SVGs in public/images/letters-numbers/`);
  generated.forEach(({ id, text }) => console.log(`  ✓ ${id} → "${text}"`));
  console.log(`\nSkipped ${skipped.length} items (not literal characters):`);
  skipped.forEach(({ id, name }) => console.log(`  - ${id}: ${name}`));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
