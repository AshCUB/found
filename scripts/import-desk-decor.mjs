#!/usr/bin/env node

/**
 * Desk Decor Importer
 * Usage: npm run import-desk-decor -- "<source folder>" [--force] [--prune]
 *
 * Source folder layout:
 *   Materials/<image>             desk materials (all free)
 *   <Category>/<tier>/<image>     decorations, grouped by category in the Desk tab; tier is free, low, med (or medium)
 *                                 or high, priced in src/data/deskDecorTiers.js
 *
 * Updates src/data/deskDecorCatalog.json, writes the images to public/images/desk/{materials,decorations}/<id>.webp
 * (shrunk as in desk-decor-images.mjs), and writes supabase/desk_decor_prices.sql, which must be run in the Supabase
 * SQL editor after every import so purchases are checked against the new prices.
 *
 * Items are matched to the catalog by file name, so moving a file to another category or tier keeps its id, name,
 * description and size. New files get an id and name from their file name and an empty description (a short sentence
 * shown when buying); edit them (and size) in the catalog afterwards, but never change an id once it's live, since
 * ids are saved to user accounts. Items whose file is gone are removed.
 *
 * --force  re-converts every image (otherwise only new images and ones whose source file changed)
 * --prune  deletes images in public/images/desk that are no longer in the catalog
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { DESK_IMAGE_KINDS } from './desk-decor-images.mjs';
import { TIER_ALIASES, TIER_PRICES } from '../src/data/deskDecorTiers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = join(ROOT, 'src/data/deskDecorCatalog.json');
const PRICES_SQL_PATH = join(ROOT, 'supabase/desk_decor_prices.sql');
const IMAGE_DIR = join(ROOT, 'public/images/desk');
const RASTER_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);
const MATERIALS_FOLDER = 'materials';
const DEFAULT_DECORATION_SIZE = 0.3;
const TIER_ORDER = Object.keys(TIER_PRICES);

const args = process.argv.slice(2);
const sourceDir = args.find((arg) => !arg.startsWith('--'));
const force = args.includes('--force');
const prune = args.includes('--prune');

const warnings = [];
const warn = (message) => warnings.push(message);

const isImage = (file) => RASTER_EXTENSIONS.has(extname(file).toLowerCase());
const entries = (dir, directories) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() === directories && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
// "Blue Candle.png" -> "Blue Candle" (also drops doubled extensions, e.g. "photo.jpeg.png").
const stem = (file) => (isImage(file) ? stem(file.slice(0, -extname(file).length)) : file);
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sentenceCase = (text) => {
  const words = text.replace(/[_\s]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Finds every image in the source folder: { materials: [{ file, path }], decorations: [{ file, path, category, tier }] }.
function scanSource() {
  const materials = [];
  const decorations = [];
  for (const folder of entries(sourceDir, true)) {
    const dir = join(sourceDir, folder);
    if (folder.toLowerCase() === MATERIALS_FOLDER) {
      materials.push(...entries(dir, false).filter(isImage).map((file) => ({ file, path: join(dir, file) })));
      continue;
    }
    entries(dir, false)
      .filter(isImage)
      .forEach((file) => warn(`${folder}/${file}: not in a tier folder (${TIER_ORDER.join(', ')}), skipped`));
    for (const tierFolder of entries(dir, true)) {
      const tier = TIER_ALIASES[tierFolder.toLowerCase()] ?? tierFolder.toLowerCase();
      if (!(tier in TIER_PRICES)) {
        warn(`${folder}/${tierFolder}: not a tier folder (${TIER_ORDER.join(', ')}), skipped`);
        continue;
      }
      const tierDir = join(dir, tierFolder);
      decorations.push(
        ...entries(tierDir, false)
          .filter(isImage)
          .map((file) => ({ file, path: join(tierDir, file), category: folder, tier }))
      );
    }
  }
  return { materials, decorations };
}

// Matches found files to previous catalog entries by file name. Returns [{ entry, path }], plus what was added/removed.
function merge(label, found, previous, build) {
  const byFile = new Map(previous.map((entry) => [entry.source.toLowerCase(), entry]));
  const ids = new Set(previous.map((entry) => entry.id));
  const seen = new Set();
  const items = [];
  const added = [];
  for (const item of found) {
    const key = item.file.toLowerCase();
    if (seen.has(key)) throw new Error(`Two ${label} are named "${item.file}". File names must be unique.`);
    seen.add(key);
    let old = byFile.get(key);
    if (!old) {
      const base = slug(stem(item.file)) || 'item';
      let id = base;
      for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
      ids.add(id);
      old = { id, name: sentenceCase(stem(item.file)) };
      added.push(old);
    }
    items.push({ entry: build(old, item), path: item.path });
  }
  const removed = previous.filter((entry) => !seen.has(entry.source.toLowerCase()));
  return { items, added, removed };
}

// Converts the image unless its WebP is newer than the source. Returns 'converted', 'unchanged' or 'kept'.
async function writeImage(kind, entry, sourcePath) {
  const output = join(IMAGE_DIR, kind, `${entry.id}.webp`);
  const exists = existsSync(output);
  if (exists && !force && statSync(output).mtimeMs >= statSync(sourcePath).mtimeMs) return 'unchanged';
  const metadata = await sharp(sourcePath, { limitInputPixels: false }).metadata();
  if (kind === 'decorations' && !metadata.hasAlpha) {
    if (exists) {
      warn(`${entry.source}: has no transparent background, so the existing ${entry.id}.webp was kept`);
      return 'kept';
    }
    warn(`${entry.source}: has no transparent background, so its background will show on the desk`);
  }
  const image = sharp(sourcePath, { limitInputPixels: false }).rotate();
  writeFileSync(output, await (await DESK_IMAGE_KINDS[kind].convert(image)).toBuffer());
  return 'converted';
}

const sqlText = (value) => `'${String(value).replace(/'/g, "''")}'`;

function pricesSql(decorations) {
  const ids = decorations.map((decoration) => sqlText(decoration.id)).join(', ');
  const rows = decorations.map((decoration) => `  (${sqlText(decoration.id)}, ${TIER_PRICES[decoration.tier]})`).join(',\n');
  return `-- Generated by \`npm run import-desk-decor\` from src/data/deskDecorCatalog.json. Don't edit by hand.
-- Decoration prices that Supabase checks purchases and saved desks against (free decorations cost 0).
-- Run in the Supabase SQL editor after 20261117000000_desk_points.sql, and again after every import.

begin;

delete from public.desk_decor_prices where decor_id not in (${ids});

insert into public.desk_decor_prices (decor_id, price) values
${rows}
on conflict (decor_id) do update set price = excluded.price;

commit;
`;
}

async function main() {
  if (!sourceDir || !existsSync(sourceDir)) {
    console.error('Usage: npm run import-desk-decor -- "<source folder>" [--force] [--prune]');
    process.exit(1);
  }
  const previous = existsSync(CATALOG_PATH)
    ? JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
    : { materials: [], decorations: [] };
  const found = scanSource();

  const materials = merge('materials', found.materials, previous.materials, (old, item) => ({
    id: old.id,
    name: old.name,
    source: item.file,
  }));
  const decorations = merge('decorations', found.decorations, previous.decorations, (old, item) => ({
    id: old.id,
    name: old.name,
    description: old.description ?? '',
    category: item.category,
    tier: item.tier,
    size: old.size ?? DEFAULT_DECORATION_SIZE,
    source: item.file,
  }));
  decorations.items.sort(
    (a, b) =>
      a.entry.category.localeCompare(b.entry.category) ||
      TIER_ORDER.indexOf(a.entry.tier) - TIER_ORDER.indexOf(b.entry.tier) ||
      a.entry.name.localeCompare(b.entry.name)
  );

  const counts = { converted: 0, unchanged: 0, kept: 0 };
  for (const [kind, merged] of [['materials', materials], ['decorations', decorations]]) {
    for (const { entry, path } of merged.items) {
      const result = await writeImage(kind, entry, path);
      counts[result]++;
      if (result === 'converted') console.log(`  ✓ ${kind}/${entry.id}.webp  (${entry.source})`);
    }
  }

  const catalog = {
    materials: materials.items.map(({ entry }) => entry),
    decorations: decorations.items.map(({ entry }) => entry),
  };
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  writeFileSync(PRICES_SQL_PATH, pricesSql(catalog.decorations));

  const used = Object.fromEntries(
    Object.keys(DESK_IMAGE_KINDS).map((kind) => [kind, new Set(catalog[kind].map((entry) => `${entry.id}.webp`))])
  );
  for (const kind of Object.keys(DESK_IMAGE_KINDS)) {
    for (const file of entries(join(IMAGE_DIR, kind), false).filter((f) => !used[kind].has(f))) {
      if (prune) {
        unlinkSync(join(IMAGE_DIR, kind, file));
        console.log(`  ✗ deleted ${kind}/${file}`);
      } else warn(`${kind}/${file} is no longer in the catalog (run with --prune to delete it)`);
    }
  }

  console.log(
    `\n${catalog.materials.length} materials, ${catalog.decorations.length} decorations. ` +
      `Images: ${counts.converted} converted, ${counts.unchanged + counts.kept} unchanged.`
  );
  for (const entry of [...materials.added, ...decorations.added]) console.log(`  + new: ${entry.id} ("${entry.name}")`);
  for (const entry of [...materials.removed, ...decorations.removed]) console.log(`  - removed: ${entry.id}`);
  if (materials.added.length || decorations.added.length) {
    console.log('  Check the new names, add descriptions (and check sizes) in src/data/deskDecorCatalog.json.');
  }
  for (const message of warnings) console.warn(`  ⚠ ${message}`);
  console.log('\nNext: run supabase/desk_decor_prices.sql in the Supabase SQL editor.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message ?? err);
  process.exit(1);
});
