#!/usr/bin/env node

/**
 * Image Fetcher Script
 * Downloads images for focus list items from Unsplash/Pexels/Pixabay
 * Optimizes images and records attribution metadata
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');
const IMAGES_DIR = join(ROOT_DIR, 'public/images');
const CREDITS_FILE = join(ROOT_DIR, 'src/data/imageCredits.json');
const CACHE_FILE = join(ROOT_DIR, '.image-fetch-cache.json');

// API keys from environment
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

// Image optimization settings
const MAX_WIDTH = 1200;
const TARGET_SIZE_KB = 200;

// Load focus lists data
function loadFocusLists() {
  const content = readFileSync(DATA_FILE, 'utf-8');
  // Extract the focusLists array from the file
  const match = content.match(/export const focusLists = (\[[\s\S]*\]);/);
  if (!match) {
    throw new Error('Could not parse focusLists from file');
  }
  // Use eval to parse the array (safely since we control the file)
  // eslint-disable-next-line no-eval
  return eval(match[1]);
}

// Build search query based on category and item name
function buildSearchQuery(category, itemName) {
  const categoryQueries = {
    colors: (name) => `${name} color`,
    shapes: (name) => `${name} shape`,
    textures: (name) => `${name} texture`,
    patterns: (name) => `${name} pattern`,
    'letters-numbers': (name) => {
      // Special handling for complex queries
      if (name.includes('ascending order')) return 'ascending numbers';
      if (name.includes('descending order')) return 'descending numbers';
      return name.replace('Find the ', '').replace('Find a ', '');
    },
    materials: (name) => `${name} material`,
    'plants-trees': (name) => name.replace('A ', '').replace('An ', ''),
    'signs-symbols': (name) => name.replace('A ', '').replace('An ', ''),
    perspective: (name) => {
      // Simplify perspective queries
      if (name.includes('Look up')) return 'looking up photography';
      if (name.includes('Look down')) return 'looking down photography';
      if (name.includes('Get low')) return 'low angle photography';
      return name.replace('Shoot ', '').replace(' photograph what\'s above you', '').replace(' photograph what\'s at your feet', '').replace(' photography technique', '');
    },
  };

  const queryBuilder = categoryQueries[category] || ((name) => name);
  return queryBuilder(itemName);
}

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Fetch from Unsplash
async function fetchFromUnsplash(query, perPage = 5) {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY not set');
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.append('query', query);
  url.searchParams.append('per_page', perPage);
  url.searchParams.append('orientation', 'squarish');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results.map((photo) => ({
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    downloadUrl: photo.links.download_location,
    id: photo.id,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    pageUrl: photo.links.html,
    source: 'unsplash',
    license: 'Unsplash License (free to use)',
  }));
}

// Fetch from Pexels
async function fetchFromPexels(query, perPage = 5) {
  if (!PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY not set');
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.append('query', query);
  url.searchParams.append('per_page', perPage);
  url.searchParams.append('orientation', 'square');

  const response = await fetch(url, {
    headers: {
      'Authorization': PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status}`);
  }

  const data = await response.json();
  return data.photos.map((photo) => ({
    url: photo.src.large2x,
    thumbUrl: photo.src.medium,
    id: photo.id.toString(),
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    pageUrl: photo.src.original,
    source: 'pexels',
    license: 'Pexels License (free to use)',
  }));
}

// Fetch from Pixabay
async function fetchFromPixabay(query, perPage = 5) {
  if (!PIXABAY_API_KEY) {
    throw new Error('PIXABAY_API_KEY not set');
  }

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.append('key', PIXABAY_API_KEY);
  url.searchParams.append('q', query);
  url.searchParams.append('per_page', perPage);
  url.searchParams.append('image_type', 'photo');
  url.searchParams.append('safesearch', 'true');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Pixabay API error: ${response.status}`);
  }

  const data = await response.json();
  return data.hits.map((photo) => ({
    url: photo.webformatURL,
    thumbUrl: photo.previewURL,
    id: photo.id.toString(),
    photographer: photo.user,
    photographerUrl: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
    pageUrl: photo.pageURL,
    source: 'pixabay',
    license: 'Pixabay License (free to use)',
  }));
}

// Try to fetch from available sources
async function fetchImage(query) {
  const sources = [];

  if (UNSPLASH_ACCESS_KEY) {
    sources.push(() => fetchFromUnsplash(query));
  }
  if (PEXELS_API_KEY) {
    sources.push(() => fetchFromPexels(query));
  }
  if (PIXABAY_API_KEY) {
    sources.push(() => fetchFromPixabay(query));
  }

  if (sources.length === 0) {
    throw new Error('No API keys configured. Set UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, or PIXABAY_API_KEY');
  }

  for (const fetchFn of sources) {
    try {
      const results = await fetchFn(query);
      if (results && results.length > 0) {
        return results[0]; // Return first (best) result
      }
    } catch (err) {
      console.warn(`  Source failed: ${err.message}`);
    }
  }

  throw new Error('All image sources failed');
}

// Convert SVG path to WebP/JPEG path
function convertImagePath(svgPath) {
  return svgPath.replace('.svg', '.webp');
}

// Ensure directory exists
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Load cache
function loadCache() {
  if (existsSync(CACHE_FILE)) {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  }
  return {};
}

// Save cache
function saveCache(cache) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Load existing credits
function loadCredits() {
  if (existsSync(CREDITS_FILE)) {
    return JSON.parse(readFileSync(CREDITS_FILE, 'utf-8'));
  }
  return {};
}

// Save credits
function saveCredits(credits) {
  writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2));
}

// Main processing function
async function processItem(category, item, cache, credits) {
  const itemId = item.id;
  const svgPath = item.image;
  const webpPath = convertImagePath(svgPath);
  const localPath = join(ROOT_DIR, 'public', webpPath);

  // Check if already processed
  if (cache[itemId] && existsSync(localPath)) {
    console.log(`  ✓ ${item.name} (already downloaded)`);
    return { cache, credits };
  }

  console.log(`  → ${item.name}`);

  try {
    const query = buildSearchQuery(category.id, item.name);
    console.log(`    Query: "${query}"`);

    const imageData = await fetchImage(query);

    // Download image
    ensureDir(dirname(localPath));
    await downloadImage(imageData.url, localPath);

    // Record metadata
    cache[itemId] = {
      downloaded: true,
      localPath: webpPath,
      timestamp: Date.now(),
    };

    credits[itemId] = {
      id: itemId,
      name: item.name,
      localPath: webpPath,
      source: imageData.source,
      pageUrl: imageData.pageUrl,
      photographer: imageData.photographer,
      photographerUrl: imageData.photographerUrl,
      license: imageData.license,
      downloadedAt: new Date().toISOString(),
    };

    console.log(`    ✓ Downloaded from ${imageData.source}`);
  } catch (err) {
    console.error(`    ✗ Failed: ${err.message}`);
    cache[itemId] = {
      downloaded: false,
      error: err.message,
      timestamp: Date.now(),
    };
  }

  return { cache, credits };
}

// Process category cover image
async function processCategoryCover(category, cache, credits) {
  const coverId = `${category.id}-cover`;
  const svgPath = category.image;
  const webpPath = convertImagePath(svgPath);
  const localPath = join(ROOT_DIR, 'public', webpPath);

  // Check if already processed
  if (cache[coverId] && existsSync(localPath)) {
    console.log(`  ✓ ${category.name} cover (already downloaded)`);
    return { cache, credits };
  }

  console.log(`  → ${category.name} cover`);

  try {
    const query = `${category.name} abstract`;
    console.log(`    Query: "${query}"`);

    const imageData = await fetchImage(query);

    // Download image
    ensureDir(dirname(localPath));
    await downloadImage(imageData.url, localPath);

    // Record metadata
    cache[coverId] = {
      downloaded: true,
      localPath: webpPath,
      timestamp: Date.now(),
    };

    credits[coverId] = {
      id: coverId,
      name: `${category.name} cover`,
      localPath: webpPath,
      source: imageData.source,
      pageUrl: imageData.pageUrl,
      photographer: imageData.photographer,
      photographerUrl: imageData.photographerUrl,
      license: imageData.license,
      downloadedAt: new Date().toISOString(),
    };

    console.log(`    ✓ Downloaded from ${imageData.source}`);
  } catch (err) {
    console.error(`    ✗ Failed: ${err.message}`);
    cache[coverId] = {
      downloaded: false,
      error: err.message,
      timestamp: Date.now(),
    };
  }

  return { cache, credits };
}

// Process a category
async function processCategory(category, cache, credits) {
  console.log(`\nProcessing category: ${category.name} (${category.items.length} items)`);

  // Process cover image
  const coverResult = await processCategoryCover(category, cache, credits);
  cache = coverResult.cache;
  credits = coverResult.credits;
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Process items
  for (const item of category.items) {
    const result = await processItem(category, item, cache, credits);
    cache = result.cache;
    credits = result.credits;

    // Rate limiting: small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { cache, credits };
}

// Main function
async function main() {
  console.log('Image Fetcher Script\n');

  // Check for API keys
  if (!UNSPLASH_ACCESS_KEY && !PEXELS_API_KEY && !PIXABAY_API_KEY) {
    console.error('ERROR: No API keys configured.');
    console.error('Please set at least one of these environment variables:');
    console.error('  - UNSPLASH_ACCESS_KEY');
    console.error('  - PEXELS_API_KEY');
    console.error('  - PIXABAY_API_KEY');
    console.error('\nTo get keys:');
    console.error('  Unsplash: https://unsplash.com/developers');
    console.error('  Pexels: https://www.pexels.com/api/');
    console.error('  Pixabay: https://pixabay.com/api/docs/');
    process.exit(1);
  }

  console.log('Available sources:');
  if (UNSPLASH_ACCESS_KEY) console.log('  ✓ Unsplash');
  if (PEXELS_API_KEY) console.log('  ✓ Pexels');
  if (PIXABAY_API_KEY) console.log('  ✓ Pixabay');

  // Load data
  const focusLists = loadFocusLists();
  let cache = loadCache();
  let credits = loadCredits();

  // Ensure images directory exists
  ensureDir(IMAGES_DIR);

  // Process each category
  for (const category of focusLists) {
    const result = await processCategory(category, cache, credits);
    cache = result.cache;
    credits = result.credits;
  }

  // Save cache and credits
  saveCache(cache);
  saveCredits(credits);

  // Summary
  console.log('\n=== Summary ===');
  const downloaded = Object.values(cache).filter((c) => c.downloaded).length;
  const failed = Object.values(cache).filter((c) => !c.downloaded).length;
  const total = Object.keys(cache).length;

  console.log(`Downloaded: ${downloaded}/${total}`);
  console.log(`Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\nFailed items:');
    for (const [id, data] of Object.entries(cache)) {
      if (!data.downloaded) {
        console.log(`  - ${id}: ${data.error}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
