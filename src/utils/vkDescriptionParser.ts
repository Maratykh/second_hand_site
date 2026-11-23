import type { ProductCategory, ProductMeasurements, ProductSize } from '../types/store';

export interface ParsedVkItem {
  title: string;
  price: number;
  size: ProductSize;
  category: ProductCategory;
  description: string;
  image: string;
  measurements?: ProductMeasurements;
}

export function parseVkItemDescription(
  text: string,
  defaultCategory: ProductCategory = 'hoodies'
): {
  title: string;
  price: number;
  size: ProductSize;
  category: ProductCategory;
  measurements?: ProductMeasurements;
} {
  // Normalize HTML line breaks and entities
  const clean = (text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&#\d+;/g, '')
    .trim();

  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  let price = 0;
  let size: ProductSize = 'M';
  let category: ProductCategory = defaultCategory;
  const measurements: ProductMeasurements = {};

  for (const line of lines) {
    // Title is usually the first line with real text that is not price/size/links/promo
    if (
      !title &&
      !line.startsWith('👉') &&
      !line.startsWith('http') &&
      !line.startsWith('📌') &&
      !/^(цена|размер|price|size|замеры)/i.test(line)
    ) {
      title = line.replace(/^[•*\-\s]+/, '').slice(0, 100);
    }

    // Price
    const priceMatch = line.match(/(?:цена|price)[:\s]*(\d+)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10);
    }

    // Size
    const sizeMatch = line.match(/(?:размер|size)[:\s]*([a-zA-Z0-9\s/_-]+)/i);
    if (sizeMatch) {
      const raw = sizeMatch[1].trim().toUpperCase();
      if (raw === 'OS' || raw === 'ONE-SIZE' || raw.includes('ONE SIZE')) {
        size = 'ONE SIZE';
      } else if (raw.includes('XXL')) {
        size = 'XXL';
      } else if (raw.includes('XL')) {
        size = 'XL';
      } else if (raw.includes('XS')) {
        size = 'XS';
      } else if (raw.includes('L')) {
        size = 'L';
      } else if (raw.includes('M')) {
        size = 'M';
      } else if (raw.includes('S')) {
        size = 'S';
      }
    }

    // Measurements
    const chestMatch = line.match(/(?:полуобхват груди|грудь|ширина)[:\s\-]*(\d+)\s*см/i);
    if (chestMatch) measurements.width = `${chestMatch[1]} см`;

    const lengthMatch = line.match(/(?:длина)[:\s\-]*(\d+)\s*см/i);
    if (lengthMatch) measurements.length = `${lengthMatch[1]} см`;

    const sleeveMatch = line.match(/(?:рукав)[:\s\-]*(\d+)\s*см/i);
    if (sleeveMatch) measurements.sleeve = `${sleeveMatch[1]} см`;
  }

  if (!title) {
    title = 'Винтажная позиция';
  }

  const lowerText = (title + ' ' + clean).toLowerCase();
  if (/шопер|шоппер|рюкзак|сумк|очки|кольцо|кепи|кепк|шапк|ремень|аксессуар|браслет|значок/i.test(lowerText)) {
    category = 'accessories';
  } else if (/свитшот|худи|байк|толстовк|кардиган|лонгслив|кофт|флис|олимпийк|джемпер|пуловер|водолазк/i.test(lowerText)) {
    category = 'hoodies';
  } else if (/куртк|косух|ветровк|бомбер|пуховик|пальто|плащ|жилет|анорак/i.test(lowerText)) {
    category = 'jackets';
  } else if (/футболк|майк|поло/i.test(lowerText)) {
    category = 'tshirts';
  } else if (/джинс|брюк|штаны|шорт|карго|спортивки/i.test(lowerText)) {
    category = 'pants';
  }

  return {
    title,
    price,
    size,
    category,
    measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
  };
}
