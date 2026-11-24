#!/usr/bin/env node

/**
 * Seasonal image fetcher
 * Downloads a Pixabay photo for every seasonal list cover and item whose image
 * (images/seasonal/<listId>/<itemId>.webp) doesn't exist yet, saves it as WebP
 * and records attribution in src/data/imageCredits.json.
 *
 * Usage: npm run fetch-seasonal-images            (needs PIXABAY_API_KEY in .env)
 *        npm run fetch-seasonal-images -- fall/acorn christmas/santa   (re-fetch, using the next search result)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { focusLists } from '../src/data/focusLists.js';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const CREDITS_FILE = join(ROOT_DIR, 'src/data/imageCredits.json');
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const MAX_WIDTH = 800;
const QUALITY = 75;

const COVER_QUERIES = {
  fall: 'autumn leaves',
  winter: 'winter snow',
  spring: 'spring blossoms',
  summer: 'summer beach',
  'new-years': 'new year fireworks',
  'chinese-new-year': 'chinese new year lanterns',
  'valentines-day': 'valentine hearts',
  'st-patricks-day': 'shamrock',
  easter: 'easter eggs',
  'pride-month': 'pride flag',
  'fourth-of-july': 'american flag fireworks',
  halloween: 'halloween pumpkins',
  thanksgiving: 'thanksgiving dinner',
  hanukkah: 'hanukkah menorah',
  christmas: 'christmas tree',
};

// Search terms for items whose name alone would be ambiguous, keyed by <listId>/<itemId>
const ITEM_QUERIES = {
  'fall/a-leaf-still-green': 'green leaf autumn',
  'fall/pumpkin': 'pumpkin',
  'winter/gloves': 'winter gloves',
  'winter/hats': 'knit winter hat',
  'winter/big-coats': 'winter coat',
  'winter/boots': 'winter boots snow',
  'winter/breath-you-can-see': 'cold breath winter',
  'winter/skiing': 'skiing',
  'spring/rain': 'rain drops',
  'spring/rabbit': 'wild rabbit',
  'summer/fruit': 'summer fruit',
  'summer/tanning-lotion': 'sun lotion beach',
  'summer/sand': 'beach sand',
  'summer/floatie': 'pool float',
  'summer/fan': 'electric fan',
  'summer/cooler': 'cooler box',
  'new-years/number-glasses': 'new year party glasses',
  'new-years/sparklers': 'sparkler',
  'new-years/glitter': 'glitter',
  'new-years/new-calendar': 'calendar',
  'new-years/resolutions-list': 'new year resolutions',
  'chinese-new-year/fireworks': 'chinese new year fireworks',
  'chinese-new-year/dragons': 'chinese dragon',
  'chinese-new-year/zodiac-animal': 'chinese zodiac',
  'chinese-new-year/red-decorations': 'chinese new year decorations',
  'chinese-new-year/red-clothing': 'chinese new year red dress',
  'chinese-new-year/sticky-rice-cake': 'nian gao',
  'valentines-day/heart': 'red heart',
  'valentines-day/flowers': 'flower bouquet',
  'valentines-day/cheesy-card': 'valentine card',
  'valentines-day/bow-and-arrow': 'cupid bow arrow',
  'valentines-day/candles': 'romantic candles',
  'valentines-day/pink-decorations': 'pink valentine decorations',
  'st-patricks-day/beer': 'beer glass',
  'st-patricks-day/something-gold': 'gold coins',
  'st-patricks-day/rainbow': 'rainbow',
  'st-patricks-day/something-green': 'green',
  'st-patricks-day/green-hat': 'st patricks day hat',
  'st-patricks-day/parade': 'st patricks day parade',
  'easter/bunny': 'easter bunny',
  'easter/basket': 'easter basket',
  'easter/chick': 'baby chick',
  'easter/pastel-colors': 'pastel easter',
  'pride-month/rainbow': 'rainbow',
  'pride-month/stickers': 'rainbow stickers',
  'pride-month/drag-show': 'drag queen',
  'pride-month/heels': 'high heels',
  'pride-month/glitter': 'glitter',
  'fourth-of-july/fireworks': 'fireworks',
  'fourth-of-july/eagle': 'bald eagle',
  'fourth-of-july/lady-liberty': 'statue of liberty',
  'fourth-of-july/something-red': 'red',
  'fourth-of-july/something-white': 'white',
  'fourth-of-july/something-blue': 'blue',
  'fourth-of-july/parade': 'fourth of july parade',
  'fourth-of-july/patriotic-outfit': 'patriotic outfit',
  'fourth-of-july/cooler': 'cooler box',
  'halloween/costumes': 'halloween costume',
  'halloween/candy': 'halloween candy',
  'halloween/mask': 'halloween mask',
  'halloween/skeleton': 'halloween skeleton',
  'halloween/bats': 'bat',
  'thanksgiving/football': 'american football',
  'thanksgiving/earliest-christmas-decor-you-see': 'christmas decorations',
  'thanksgiving/thanksgiving-sides': 'thanksgiving side dishes',
  'thanksgiving/set-table': 'thanksgiving table setting',
  'thanksgiving/leftovers': 'leftovers food',
  'thanksgiving/black-friday-ad': 'black friday sale',
  'thanksgiving/something-youre-thankful-for': 'gratitude',
  'thanksgiving/cornucopia': 'cornucopia',
  'hanukkah/gelt-chocolate-coins': 'chocolate coins',
  'hanukkah/candles': 'hanukkah candles',
  'hanukkah/sufganiyot-jelly-donuts': 'jelly donut',
  'hanukkah/candle-lighting': 'menorah lighting',
  'hanukkah/blue-and-silver': 'blue silver decorations',
  'christmas/presents': 'christmas presents',
  'christmas/trees': 'christmas tree',
  'christmas/santa': 'santa claus',
  'christmas/candy-canes': 'candy cane',
  'christmas/ribbon-or-bow': 'gift bow',
  'christmas/elf-on-the-shelf': 'christmas elf',
  'christmas/tree-topper-star-or-angel': 'christmas tree star',
  'christmas/christmas-movie-on-tv': 'christmas movie',
};

const queryFor = (listId, item) =>
  ITEM_QUERIES[`${listId}/${item.id}`] ?? item.name.replace(/\s*\(.*\)/, '').replace(/^(a|an|the) /i, '');

async function searchPixabay(query) {
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', PIXABAY_API_KEY);
  url.searchParams.set('q', query.slice(0, 100));
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('per_page', '10');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pixabay API error: ${response.status} ${await response.text()}`);
  return (await response.json()).hits;
}

async function fetchOne({ key, name, query, image }, credits, refetch) {
  const localPath = join(ROOT_DIR, 'public', image);
  if (existsSync(localPath) && !refetch) return 'skipped';

  const hits = await searchPixabay(query);
  // On a re-fetch, skip photos already used for this image.
  const used = new Set([credits[key]?.pageUrl, ...(credits[key]?.rejected ?? [])].filter(Boolean));
  const hit = hits.find((h) => !used.has(h.pageURL));
  if (!hit) throw new Error(`no results for "${query}"`);

  const response = await fetch(hit.largeImageURL);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const output = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  mkdirSync(dirname(localPath), { recursive: true });
  writeFileSync(localPath, output);

  credits[key] = {
    id: key,
    name,
    localPath: `/${image}`,
    source: 'pixabay',
    pageUrl: hit.pageURL,
    photographer: hit.user,
    photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
    license: 'Pixabay License (free to use)',
    query,
    rejected: refetch && credits[key]?.pageUrl ? [...(credits[key].rejected ?? []), credits[key].pageUrl] : credits[key]?.rejected,
    downloadedAt: new Date().toISOString(),
  };
  return 'downloaded';
}

async function main() {
  if (!PIXABAY_API_KEY) {
    console.error('PIXABAY_API_KEY not set (add it to .env)');
    process.exit(1);
  }
  const refetch = new Set(process.argv.slice(2));
  const credits = JSON.parse(readFileSync(CREDITS_FILE, 'utf-8'));
  const jobs = focusLists
    .filter((list) => list.image?.startsWith('images/seasonal/'))
    .flatMap((list) => [
      { key: `seasonal-${list.id}-cover`, ref: `${list.id}/cover`, name: `${list.name} cover`, query: COVER_QUERIES[list.id] ?? list.name, image: list.image },
      ...list.items.map((item) => ({ key: `seasonal-${list.id}-${item.id}`, ref: `${list.id}/${item.id}`, name: item.name, query: queryFor(list.id, item), image: item.image })),
    ])
    .filter((job) => !refetch.size || refetch.has(job.ref));

  const failed = [];
  let downloaded = 0;
  for (const job of jobs) {
    try {
      const result = await fetchOne(job, credits, refetch.has(job.ref));
      if (result === 'downloaded') {
        downloaded++;
        console.log(`  ✓ ${job.ref} ("${job.query}")`);
        writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2));
        // Pixabay allows 100 requests per minute.
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    } catch (err) {
      failed.push(job.ref);
      console.error(`  ✗ ${job.ref} ("${job.query}"): ${err.message}`);
    }
  }
  console.log(`\nDownloaded ${downloaded}, failed ${failed.length}, of ${jobs.length}`);
  if (failed.length) console.log(`Failed: ${failed.join(' ')}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
