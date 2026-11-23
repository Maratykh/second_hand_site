import type { ProductCategory, ProductSize } from '../types/store';

export interface ParsedVkItem {
  title: string;
  price: number;
  size: ProductSize;
  category: ProductCategory;
  description: string;
  image: string;
}

export function parseVkItemDescription(
  text: string,
  defaultCategory: ProductCategory = 'hoodies'
): {
  title: string;
  price: number;
  size: ProductSize;
  category: ProductCategory;
} {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  let price = 0;
  let size: ProductSize = 'M';
  let category: ProductCategory = defaultCategory;

  for (const line of lines) {
    if (
      !title &&
      !line.startsWith('👉') &&
      !line.startsWith('http') &&
      !/^(цена|размер|price|size)/i.test(line)
    ) {
      title = line.replace(/^[•*\-\s]+/, '').slice(0, 100);
    }

    const priceMatch = line.match(/(?:цена|price)[:\s]*(\d+)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10);
    }

    const sizeMatch = line.match(/(?:размер|size)[:\s]*([a-zA-Z0-9\s/-]+)/i);
    if (sizeMatch) {
      const raw = sizeMatch[1].trim().toUpperCase();
      if (['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'].includes(raw)) {
        size = raw as ProductSize;
      }
    }
  }

  if (!title) {
    title = 'Винтажная позиция';
  }

  const lowerText = (title + ' ' + (text || '')).toLowerCase();
  if (/свитшот|худи|байк|толстовк|кардиган|лонгслив/i.test(lowerText)) {
    category = 'hoodies';
  } else if (/куртк|косух|ветровк|бомбер|пуховик/i.test(lowerText)) {
    category = 'jackets';
  } else if (/футболк|майк|поло/i.test(lowerText)) {
    category = 'tshirts';
  } else if (/джинс|брюк|штаны|шорт/i.test(lowerText)) {
    category = 'pants';
  } else if (/сумк|кепк|шапк|ремень|аксессуар/i.test(lowerText)) {
    category = 'accessories';
  }

  return { title, price, size, category };
}
