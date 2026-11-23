const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'clothes.txt');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

function cleanHtml(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&#128073;&#127995;/g, '')
    .replace(/&#128204;/g, '📌 ')
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function parseItem(item, index) {
  const clean = cleanHtml(item.description);
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let title = '';
  let price = 0;
  let size = 'ONE SIZE';
  let category = 'accessories';
  const measurements = {};

  for (const line of lines) {
    if (
      !title &&
      !line.startsWith('👉') &&
      !line.startsWith('📌') &&
      !line.startsWith('http') &&
      !line.toLowerCase().includes('наш instagram') &&
      !line.toLowerCase().includes('подпишись') &&
      !line.toLowerCase().includes('замеры') &&
      !/^(цена|размер|price|size|полуобхват|длина|рукав)/i.test(line)
    ) {
      let t = line.replace(/^[•*\-\s]+/, '').trim();
      t = t.replace(/<[^>]+>/g, '').trim();
      if (t.length >= 2 && !/^(фотография)$/i.test(t)) {
        title = t;
        break;
      }
    }
  }

  // Price parsing
  for (const line of lines) {
    const byn = line.match(/(?:цена|price)?[:\s]*(\d+)\s*(?:byn|р\b|бел)/i);
    if (byn) {
      price = parseInt(byn[1], 10);
      break;
    }
    const slashMatch = line.match(/(\d+)\s*(?:byn|р\b)/i);
    if (slashMatch) {
      price = parseInt(slashMatch[1], 10);
      break;
    }
    const rubMatch = line.match(/(\d+)\s*(?:rub|руб)/i);
    if (rubMatch && price === 0) {
      price = Math.round(parseInt(rubMatch[1], 10) / 30);
    }
  }

  // Size parsing
  for (const line of lines) {
    const sMatch = line.match(/(?:размер|size)[:\s]*([a-zA-Z0-9\s/–—\-]+)/i);
    if (sMatch) {
      const rawSize = sMatch[1].trim().toUpperCase();
      if (rawSize.includes('OS') || rawSize.includes('ONE') || rawSize.includes('ЕДИН')) {
        size = 'ONE SIZE';
      } else if (rawSize.includes('XXL')) {
        size = 'XXL';
      } else if (rawSize.includes('XL')) {
        size = 'XL';
      } else if (rawSize.includes('L')) {
        size = 'L';
      } else if (rawSize.includes('M')) {
        size = 'M';
      } else if (rawSize.includes('S')) {
        size = 'S';
      } else if (rawSize.includes('XS')) {
        size = 'XS';
      } else {
        size = 'ONE SIZE';
      }
      break;
    }
  }

  const lower = (title + ' ' + clean).toLowerCase();
  if (/свитшот|худи|байк|толстовк|кардиган|лонгслив|кофта|флис|джемпер/i.test(lower)) {
    category = 'hoodies';
  } else if (/куртк|косух|ветровк|бомбер|пуховик|олимпийк|пальто|анорак|жилет/i.test(lower)) {
    category = 'jackets';
  } else if (/футболк|майк|поло|топ|джерси/i.test(lower)) {
    category = 'tshirts';
  } else if (/джинс|брюк|штаны|шорт|комбинезон|чинос|карго/i.test(lower)) {
    category = 'pants';
  } else {
    category = 'accessories';
  }

  for (const line of lines) {
    const chestMatch = line.match(/полуобхват\s*груди\s*[-–—:]*\s*(\d+)/i);
    if (chestMatch) measurements.width = chestMatch[1] + ' см';
    const lenMatch = line.match(/длина\s*[-–—:]*\s*(\d+)/i);
    if (lenMatch) measurements.length = lenMatch[1] + ' см';
    const sleeveMatch = line.match(/рукав\s*[-–—:]*\s*(\d+)/i);
    if (sleeveMatch) measurements.sleeve = sleeveMatch[1] + ' см';
  }

  if (!title) {
    if (category === 'hoodies') title = 'Винтажный свитшот / худи';
    else if (category === 'jackets') title = 'Винтажная куртка / олимпийка';
    else if (category === 'tshirts') title = 'Винтажная футболка';
    else if (category === 'pants') title = 'Винтажные брюки / джинсы';
    else title = 'Винтажный аксессуар';
  }

  return {
    id: 'vk-' + (index + 1),
    title: title.slice(0, 100),
    description: clean.slice(0, 1800),
    price: price > 0 ? price : 45,
    currency: 'BYN',
    category,
    sizes: [size],
    images: [item.image],
    era: 'Винтаж / Y2K',
    condition: 'Отличное селективное',
    measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
    status: 'published',
    inStock: true,
    featured: index < 12
  };
}

const validProducts = [];
let skipped = 0;

raw.forEach((item, idx) => {
  if (!item.image) {
    skipped++;
    return;
  }
  const desc = (item.description || '').trim();
  if (desc === 'Фотография' && !desc.includes('цена')) {
    skipped++;
    return;
  }
  validProducts.push(parseItem(item, idx));
});

console.log('Total valid products processed:', validProducts.length);
console.log('Skipped empty photo posts:', skipped);

const outTs = `import type { Product } from '../types/store';

export const HERO_BANNER_IMAGE = '${validProducts[0]?.images[0] || '/src/assets/images/hero_lavka_zombie_1795440675611.jpg'}';

export const SEED_PRODUCTS: Product[] = ${JSON.stringify(validProducts, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'src', 'data', 'seedProducts.ts'), outTs, 'utf8');
console.log('Successfully wrote src/data/seedProducts.ts with', validProducts.length, 'products!');
