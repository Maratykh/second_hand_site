import type { Product } from '../types/store';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_lavka_zombie_1795440675611.jpg';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'seed-leather-biker-90s',
    title: 'Кожаная косуха 1990s Heavy Cowhide',
    description:
      'Тяжёлая архивная байкерская куртка из плотной воловьей кожи с естественной потёртой патиной. Асимметричная стальная молния, регулируемый ремень на поясе, стёганая подкладка. Отобрана вручную для еженедельного дропа Лавки Зомби.',
    price: 295,
    currency: 'BYN',
    category: 'jackets',
    sizes: ['L', 'XL'],
    images: ['/src/assets/images/product_leather_jacket_1795440730604.jpg'],
    era: '90-е',
    condition: '9/10 — естественная патина',
    measurements: {
      length: '65 см',
      width: '59 см',
      sleeve: '64 см',
    },
    status: 'published',
    inStock: true,
    featured: true,
  },
  {
    id: 'seed-faded-skull-tee',
    title: 'Винтажная футболка Washed Charcoal Skull',
    description:
      'Плотный вываренный хлопок 240 г/м², бокси-крой, благородный графитовый фейд и винтажный кракелюр на принте. Лёгкое состаривание по горловине. Идеально садится оверсайзом.',
    price: 68,
    currency: 'BYN',
    category: 'tshirts',
    sizes: ['M', 'L'],
    images: ['/src/assets/images/product_graphic_tee_1795440654675.jpg'],
    era: '90-е',
    condition: '8.5/10 — натуральный фейд',
    measurements: {
      length: '72 см',
      width: '56 см',
      sleeve: '22 см',
    },
    status: 'published',
    inStock: true,
    featured: true,
  },
  {
    id: 'seed-baggy-selvedge-jeans',
    title: 'Широкие винтажные джинсы Distressed Indigo',
    description:
      'Свободный прямой силуэт 90-х из плотного денима глубокого индиго с натуральными вискерами, аккуратными потёртостями на коленях и рваным краем штанин. Классическая застёжка на болтах.',
    price: 135,
    currency: 'BYN',
    category: 'pants',
    sizes: ['M', 'L', 'XL'],
    images: ['/src/assets/images/product_distressed_jeans_1795440657498.jpg'],
    era: 'Y2K',
    condition: '8.5/10 — заводской и винтажный дистресс',
    measurements: {
      length: '106 см',
      width: '43 см (пояс)',
    },
    status: 'published',
    inStock: true,
    featured: true,
  },
  {
    id: 'seed-workwear-zip-hoodie',
    title: 'Тяжёлый зип-худи Faded Olive Workwear',
    description:
      'Укороченный широкий крой из плотного тяжёлого футера с выгоревшим оливково-графитовым оттенком, массивной латунной молнией и аутентичными потёртостями на манжетах.',
    price: 115,
    currency: 'BYN',
    category: 'hoodies',
    sizes: ['S', 'M', 'L'],
    images: ['/src/assets/images/product_vintage_hoodie_1795440653169.jpg'],
    era: 'Y2K',
    condition: '9/10 — плотный футер',
    measurements: {
      length: '66 см',
      width: '61 см',
      sleeve: '61 см',
    },
    status: 'published',
    inStock: true,
    featured: true,
  },
];
