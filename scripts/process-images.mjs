#!/usr/bin/env node

/**
 * Image Processing Script
 * - Generates SVG graphics for Colors, Shapes, and Patterns
 * - Scrapes and verifies photos for other categories
 * - Creates imageSources.json for attribution
 * - Generates review HTML pages
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_FILE = join(ROOT_DIR, 'src/data/focusLists.js');
const IMAGES_DIR = join(ROOT_DIR, 'public/images');
const IMAGE_SOURCES_FILE = join(ROOT_DIR, 'src/data/imageSources.json');
const CACHE_DIR = join(ROOT_DIR, '.image-cache');
const REVIEW_DIR = join(ROOT_DIR, 'scripts/review');

// Color hex values for all 100 colors
const COLOR_HEX_MAP = {
  'burnt-orange': '#CC5500',
  'cherry-red': '#DE3163',
  'sky-blue': '#87CEEB',
  'forest-green': '#228B22',
  'mustard-yellow': '#E1AD01',
  'plum': '#DDA0DD',
  'teal': '#008080',
  'blush-pink': '#DE5D83',
  'charcoal': '#36454F',
  'ivory': '#FFFFF0',
  'cobalt-blue': '#0047AB',
  'olive-green': '#808000',
  'rust': '#B7410E',
  'lavender': '#E6E6FA',
  'turquoise': '#40E0D0',
  'crimson': '#DC143C',
  'sage-green': '#9CAF88',
  'navy': '#000080',
  'peach': '#FFE5B4',
  'chocolate-brown': '#7B3F00',
  'lemon-yellow': '#F7E98E',
  'magenta': '#FF00FF',
  'slate-gray': '#708090',
  'mint-green': '#98FF98',
  'coral': '#FF7F50',
  'indigo': '#4B0082',
  'tan': '#D2B48C',
  'emerald': '#50C878',
  'maroon': '#800000',
  'powder-blue': '#B0E0E6',
  'tangerine': '#FF9966',
  'violet': '#8B00FF',
  'khaki': '#C3B091',
  'seafoam': '#98D1C8',
  'salmon': '#FA8072',
  'midnight-blue': '#191970',
  'cream': '#FFFDD0',
  'lime-green': '#32CD32',
  'brick-red': '#CB4154',
  'periwinkle': '#CCCCFF',
  'goldenrod': '#DAA520',
  'fuchsia': '#FF00FF',
  'taupe': '#483C32',
  'hunter-green': '#355E3B',
  'apricot': '#FBCEB1',
  'steel-blue': '#4682B4',
  'raspberry': '#E30B5D',
  'sand': '#C2B280',
  'eggplant': '#614051',
  'pale-yellow': '#FFFFE0',
  'denim-blue': '#1560BD',
  'copper': '#B87333',
  'moss-green': '#8A9A5B',
  'rose': '#FF007F',
  'silver': '#C0C0C0',
  'burgundy': '#800020',
  'aqua': '#00FFFF',
  'amber': '#FFBF00',
  'orchid': '#DA70D6',
  'pine-green': '#013220',
  'buttercream': '#FFFDD0',
  'cerulean': '#007BA7',
  'terracotta': '#E2725B',
  'lilac': '#C8A2C8',
  'chartreuse': '#DFFF00',
  'mahogany': '#C04000',
  'baby-blue': '#89CFF0',
  'pumpkin': '#FF7518',
  'mauve': '#E0B0FF',
  'ash-gray': '#B2BEB5',
  'jade': '#00A86B',
  'scarlet': '#FF2400',
  'honey': '#EB9605',
  'dusty-blue': '#6699CC',
  'cinnamon': '#D2691E',
  'pearl-white': '#F9E6C4',
  'royal-purple': '#7851A9',
  'fern-green': '#4F7942',
  'bubblegum-pink': '#FF69B4',
  'espresso': '#3C2415',
  'marigold': '#EAA221',
  'ocean-blue': '#006994',
  'oatmeal': '#F5DEB3',
  'wine': '#722F37',
  'pistachio': '#93C572',
  'cornflower-blue': '#6495ED',
  'sunset-orange': '#FD5E53',
  'lemon-lime': '#C1E1C1',
  'mulberry': '#C54B8C',
  'dove-gray': '#B0B0B0',
  'bronze': '#CD7F32',
  'sapphire': '#0F52BA',
  'papaya': '#FFEF00',
  'spruce': '#0A4D3C',
  'dusty-rose': '#DCA792',
  'walnut': '#784212',
  'electric-blue': '#7DF9FF',
  'gold': '#FFD700',
  'pitch-black': '#0A0A0A',
  'bright-white': '#FFFFFF',
};

// Ensure directory exists
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Load focus lists data
function loadFocusLists() {
  const content = readFileSync(DATA_FILE, 'utf-8');
  const match = content.match(/export const focusLists = (\[[\s\S]*\]);/);
  if (!match) {
    throw new Error('Could not parse focusLists from file');
  }
  // eslint-disable-next-line no-eval
  return eval(match[1]);
}

// Generate SVG color swatch
function generateColorSwatch(colorId, hex, outputPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="${hex}"/>
</svg>`;
  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, svg);
}

// Generate SVG shape
function generateShape(shapeId, outputPath) {
  const shapes = {
    'circle': '<circle cx="100" cy="100" r="80" fill="#333"/>',
    'square': '<rect x="20" y="20" width="160" height="160" fill="#333"/>',
    'triangle': '<polygon points="100,20 180,180 20,180" fill="#333"/>',
    'rectangle': '<rect x="10" y="40" width="180" height="120" fill="#333"/>',
    'oval': '<ellipse cx="100" cy="100" rx="90" ry="60" fill="#333"/>',
    'diamond': '<polygon points="100,20 180,100 100,180 20,100" fill="#333"/>',
    'star': '<polygon points="100,20 120,80 180,80 130,120 150,180 100,140 50,180 70,120 20,80 80,80" fill="#333"/>',
    'heart': '<path d="M100,180 C20,100 20,40 100,40 C180,40 180,100 100,180" fill="#333"/>',
    'arch': '<path d="M20,180 L20,100 A80,80 0 0,1 180,100 L180,180" fill="#333"/>',
    'spiral': '<path d="M100,100 m0,0 a10,10 0 1,0 20,0 a30,30 0 1,0 -60,0 a50,50 0 1,0 100,0 a70,70 0 1,0 -140,0" fill="none" stroke="#333" stroke-width="8"/>',
    'cross': '<rect x="85" y="20" width="30" height="160" fill="#333"/><rect x="20" y="85" width="160" height="30" fill="#333"/>',
    'crescent': '<path d="M100,20 A80,80 0 1,1 100,180 A60,60 0 1,0 100,20" fill="#333"/>',
    'hexagon': '<polygon points="100,20 170,60 170,140 100,180 30,140 30,60" fill="#333"/>',
    'pentagon': '<polygon points="100,20 180,75 155,175 45,175 20,75" fill="#333"/>',
    'octagon': '<polygon points="60,20 140,20 180,60 180,140 140,180 60,180 20,140 20,60" fill="#333"/>',
    'semicircle': '<path d="M20,100 A80,80 0 0,1 180,100" fill="#333"/>',
    'cylinder': '<ellipse cx="100" cy="40" rx="80" ry="20" fill="#333"/><rect x="20" y="40" width="160" height="120" fill="#333"/><ellipse cx="100" cy="160" rx="80" ry="20" fill="#333"/>',
    'cube': '<polygon points="100,20 180,60 180,140 100,180" fill="#444"/><polygon points="100,20 20,60 20,140 100,180" fill="#333"/><polygon points="20,60 100,100 180,60" fill="#555"/>',
    'sphere': '<circle cx="100" cy="100" r="80" fill="url(#sphereGrad)"/><defs><radialGradient id="sphereGrad"><stop offset="0%" stop-color="#555"/><stop offset="100%" stop-color="#333"/></radialGradient></defs>',
    'cone': '<polygon points="100,20 180,180 20,180" fill="#333"/><ellipse cx="100" cy="180" rx="80" ry="20" fill="#444"/>',
    'pyramid': '<polygon points="100,20 180,180 20,180" fill="#444"/><polygon points="100,20 20,180 60,180" fill="#333"/>',
    'ring': '<circle cx="100" cy="100" r="80" fill="none" stroke="#333" stroke-width="20"/>',
    'zigzag': '<polyline points="20,100 50,40 80,100 110,40 140,100 170,40" fill="none" stroke="#333" stroke-width="8"/>',
    'wave': '<path d="M20,100 Q60,40 100,100 T180,100" fill="none" stroke="#333" stroke-width="8"/>',
    'arrow': '<polygon points="100,20 180,100 100,180 120,100" fill="#333"/><rect x="20" y="85" width="100" height="30" fill="#333"/>',
    'parallelogram': '<polygon points="40,20 180,20 160,180 20,180" fill="#333"/>',
    'trapezoid': '<polygon points="40,20 160,20 180,180 20,180" fill="#333"/>',
    'teardrop': '<path d="M100,20 Q100,100 180,160 A80,80 0 1,1 20,160 Q100,100 100,20" fill="#333"/>',
  };

  const shape = shapes[shapeId];
  if (!shape) {
    console.warn(`  ⚠ No shape definition for ${shapeId}`);
    return;
  }

  const viewBox = shapeId === 'teardrop' ? '-20 10 240 240' : '0 0 200 200';
  const [, , vbWidth, vbHeight] = viewBox.split(' ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${vbWidth}" height="${vbHeight}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  ${shape}
</svg>`;

  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, svg);
}

// Generate SVG pattern
function generatePattern(patternId, outputPath) {
  const patterns = {
    'stripes-two-colors': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#333"/><rect x="20" width="20" height="40" fill="#666"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'polka-dots': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff"/><circle cx="20" cy="20" r="10" fill="#333"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'black-white': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#000"/><rect x="20" width="20" height="40" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'red-white': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#E53935"/><rect x="20" width="20" height="40" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'blue-white': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#1E88E5"/><rect x="20" width="20" height="40" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'green-brown': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#43A047"/><rect x="20" width="20" height="40" fill="#795548"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'three-plus-colors': '<defs><pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="20" height="60" fill="#E53935"/><rect x="20" width="20" height="60" fill="#1E88E5"/><rect x="40" width="20" height="60" fill="#43A047"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'yellow-black': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#FFEB3B"/><rect x="20" width="20" height="40" fill="#000"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'pink-gray': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#EC407A"/><rect x="20" width="20" height="40" fill="#9E9E9E"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'orange-blue': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#FF9800"/><rect x="20" width="20" height="40" fill="#1E88E5"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'checks-plaid': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff"/><rect width="20" height="20" fill="#333"/><rect x="20" y="20" width="20" height="20" fill="#333"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'stripes-warm': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#E53935"/><rect x="20" width="20" height="40" fill="#FF9800"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'stripes-cool': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#1E88E5"/><rect x="20" width="20" height="40" fill="#00BCD4"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'gold-silver-dark': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#222"/><rect width="20" height="40" fill="#FFD700"/><rect x="20" width="20" height="40" fill="#C0C0C0"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'navy-cream': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#000080"/><rect x="20" width="20" height="40" fill="#FFFDD0"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'purple-green': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#9C27B0"/><rect x="20" width="20" height="40" fill="#43A047"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'red-green': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#E53935"/><rect x="20" width="20" height="40" fill="#43A047"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'one-color-two-shades': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#E53935"/><rect x="20" width="20" height="40" fill="#EF9A9A"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'clothing': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#E53935"/><circle cx="20" cy="20" r="5" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'food-package': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#FF9800"/><rect x="10" y="10" width="20" height="20" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'floor-wall': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#795548"/><rect x="20" y="0" width="20" height="40" fill="#D7CCC8"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'bag-backpack': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#1E88E5"/><rect x="15" y="10" width="10" height="20" fill="#fff"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'tan-brown-cream': '<defs><pattern id="p" width="60" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#D2B48C"/><rect x="20" width="20" height="40" fill="#795548"/><rect x="40" width="20" height="40" fill="#FFFDD0"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'bright-neutral': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#ECEFF1"/><circle cx="20" cy="20" r="10" fill="#E53935"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'teal-coral': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#008080"/><rect x="20" width="20" height="40" fill="#FF7F50"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'black-white-bright': '<defs><pattern id="p" width="60" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#000"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#E53935"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'mug-cup-bottle': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#8D6E63"/><rect x="15" y="5" width="10" height="30" fill="#A1887F"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'pastel': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#F8BBD0"/><rect x="20" width="20" height="40" fill="#B3E5FC"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'bold-saturated': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="#E53935"/><rect x="20" width="20" height="40" fill="#1E88E5"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
    'never-wear': '<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#4CAF50"/><circle cx="20" cy="20" r="15" fill="#FFEB3B"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>',
  };

  const pattern = patterns[patternId];
  if (!pattern) {
    console.warn(`  ⚠ No pattern definition for ${patternId}`);
    return;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  ${pattern}
</svg>`;

  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, svg);
}

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
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

// Build search query for photo categories
function buildSearchQuery(category, itemName) {
  const categoryQueries = {
    textures: (name) => `${name} texture close up`,
    'letters-numbers': (name) => {
      if (name.includes('ascending')) return 'ascending numbers sequence';
      if (name.includes('descending')) return 'descending numbers sequence';
      if (name.includes('digit')) return name.replace('Find a ', '').replace(' number', ' number photo');
      return name.replace('Find the ', '').replace('Find a ', '').replace('Find ', '');
    },
    materials: (name) => `${name} material texture close up`,
    'plants-trees': (name) => name.replace('A ', '').replace('An ', ''),
    'signs-symbols': (name) => name.replace('A ', '').replace('An ', ''),
    perspective: (name) => {
      if (name.includes('Look up')) return 'looking up photography sky';
      if (name.includes('Look down')) return 'looking down photography ground';
      if (name.includes('Get low')) return 'low angle photography';
      return name.replace('Shoot ', '').replace(' photograph what\'s above you', '').replace(' photograph what\'s at your feet', '');
    },
  };

  const queryBuilder = categoryQueries[category] || ((name) => name);
  return queryBuilder(itemName);
}

// Main processing function
async function main() {
  console.log('Image Processing Script\n');

  // Load data
  const focusLists = loadFocusLists();
  ensureDir(IMAGES_DIR);
  ensureDir(CACHE_DIR);
  ensureDir(REVIEW_DIR);

  const imageSources = {};
  const stats = {
    generated: { colors: 0, shapes: 0, patterns: 0 },
    scraped: { textures: 0, 'letters-numbers': 0, materials: 0, 'plants-trees': 0, 'signs-symbols': 0, perspective: 0 },
    flagged: [],
  };

  for (const category of focusLists) {
    console.log(`\nProcessing category: ${category.name} (${category.items.length} items)`);

    if (category.id === 'colors') {
      // Generate SVG color swatches
      for (const item of category.items) {
        const hex = COLOR_HEX_MAP[item.id];
        if (!hex) {
          console.warn(`  ⚠ No hex value for ${item.id}`);
          stats.flagged.push({ category: category.id, item: item.id, reason: 'No hex value' });
          continue;
        }

        const outputPath = join(ROOT_DIR, 'public', item.image.replace('.webp', '.svg'));
        generateColorSwatch(item.id, hex, outputPath);
        stats.generated.colors++;
        console.log(`  ✓ ${item.name} (${hex})`);
      }
    } else if (category.id === 'shapes') {
      // Generate SVG shapes
      for (const item of category.items) {
        const outputPath = join(ROOT_DIR, 'public', item.image.replace('.webp', '.svg'));
        generateShape(item.id, outputPath);
        stats.generated.shapes++;
        console.log(`  ✓ ${item.name}`);
      }
    } else if (category.id === 'patterns') {
      // Generate SVG patterns
      for (const item of category.items) {
        const outputPath = join(ROOT_DIR, 'public', item.image.replace('.webp', '.svg'));
        generatePattern(item.id, outputPath);
        stats.generated.patterns++;
        console.log(`  ✓ ${item.name}`);
      }
    } else {
      // Photo categories - placeholder for now
      console.log(`  ⚠ Photo scraping not implemented yet for ${category.id}`);
      stats.flagged.push({ category: category.id, item: 'all', reason: 'Photo scraping not implemented' });
    }
  }

  // Save image sources
  writeFileSync(IMAGE_SOURCES_FILE, JSON.stringify(imageSources, null, 2));

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Generated SVGs:`);
  console.log(`  Colors: ${stats.generated.colors}`);
  console.log(`  Shapes: ${stats.generated.shapes}`);
  console.log(`  Patterns: ${stats.generated.patterns}`);
  console.log(`\nScraped photos:`);
  console.log(`  Textures: ${stats.scraped.textures}`);
  console.log(`  Letters and Numbers: ${stats.scraped['letters-numbers']}`);
  console.log(`  Materials: ${stats.scraped.materials}`);
  console.log(`  Plants and Trees: ${stats.scraped['plants-trees']}`);
  console.log(`  Signs and Symbols: ${stats.scraped['signs-symbols']}`);
  console.log(`  Perspective: ${stats.scraped.perspective}`);
  console.log(`\nFlagged items: ${stats.flagged.length}`);
  if (stats.flagged.length > 0) {
    console.log('\nFlagged items:');
    stats.flagged.forEach(f => console.log(`  - ${f.category}/${f.item}: ${f.reason}`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
