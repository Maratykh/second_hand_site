import type { Product } from '../types/store';

export const HERO_BANNER_IMAGE = '/assets/images/hero_banner.jpg';

// Initial fast skeleton/bootstrap batch (9 fresh drop items). The full 1518+ items load asynchronously via /data/seedProducts.json
export const SEED_PRODUCTS: Product[] = [
  {
    "id": "tg-1",
    "title": "Сумка через плечо Adidas Puffer (New)",
    "description": "Сумка через плечо Adidas (NEW!) с оригинальными магазинными бирками\nцена: 80 BYN // 2400 RUB\nразмер: OS\nсостояние: Новое с бирками\n\nПодпишись на наш тг: Lavkazombie",
    "price": 80,
    "currency": "BYN",
    "category": "accessories",
    "sizes": [
      "ONE SIZE"
    ],
    "images": [
      "/assets/products/tg-1.webp"
    ],
    "era": "Архивный / New",
    "condition": "Новое с бирками",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-2",
    "title": "Куртка Everest Airtech Colorblock",
    "description": "Винтажная куртка Everest Airtech в ярком колорблок дизайне\nцена: 110 BYN // 3300 RUB\nразмер: L-XL\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 110,
    "currency": "BYN",
    "category": "jackets",
    "sizes": [
      "L",
      "XL"
    ],
    "images": [
      "/assets/products/tg-2.webp"
    ],
    "era": "Винтаж / Y2K",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-3",
    "title": "Берет Kangol Angora Plaid",
    "description": "Селективный пушистый берет Kangol из ангоры в клетку тартан\nцена: 60 BYN // 1800 RUB\nразмер: OS\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 60,
    "currency": "BYN",
    "category": "accessories",
    "sizes": [
      "ONE SIZE"
    ],
    "images": [
      "/assets/products/tg-3.webp"
    ],
    "era": "Винтаж / Y2K",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-4",
    "title": "Горнолыжная куртка Raiski Retro",
    "description": "Горнолыжная куртка Raiski в ретро эстетике 90-х\nцена: 100 BYN // 3000 RUB\nразмер: L\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 100,
    "currency": "BYN",
    "category": "jackets",
    "sizes": [
      "L"
    ],
    "images": [
      "/assets/products/tg-4.webp"
    ],
    "era": "Винтаж / 90s",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-5",
    "title": "Горнолыжная куртка Everest Tech Shell",
    "description": "Горнолыжная куртка Everest в песочном цвете (Gorpcore/Tech)\nцена: 120 BYN // 3600 RUB\nразмер: M-L\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 120,
    "currency": "BYN",
    "category": "jackets",
    "sizes": [
      "M",
      "L"
    ],
    "images": [
      "/assets/products/tg-5.webp"
    ],
    "era": "Gorpcore / Y2K",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-6",
    "title": "Винтажный анорак Marwin Sports",
    "description": "Винтажный анорак Marwin Sports в горчичном цвете с карманом-кенгуру\nцена: 100 BYN // 3000 RUB\nразмер: L-XL\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 100,
    "currency": "BYN",
    "category": "jackets",
    "sizes": [
      "L",
      "XL"
    ],
    "images": [
      "/assets/products/tg-6.webp"
    ],
    "era": "Винтаж / 90s",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-7",
    "title": "Худи Dickies Williamson-Dickie",
    "description": "Плотное хлопковое худи Dickies графитового цвета с фирменным логотипом\nцена: 80 BYN // 2400 RUB\nразмер: M\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 80,
    "currency": "BYN",
    "category": "hoodies",
    "sizes": [
      "M"
    ],
    "images": [
      "/assets/products/tg-7.webp"
    ],
    "era": "Workwear / Streetwear",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-8",
    "title": "Куртка Everest Airtech Yellow",
    "description": "Аутентичная куртка Everest Airtech в желто-синем колорблоке\nцена: 100 BYN // 3000 RUB\nразмер: M-L\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 100,
    "currency": "BYN",
    "category": "jackets",
    "sizes": [
      "M",
      "L"
    ],
    "images": [
      "/assets/products/tg-8.webp"
    ],
    "era": "Винтаж / Y2K",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  },
  {
    "id": "tg-9",
    "title": "Худи Limb Concept Black",
    "description": "Черное оверсайз худи Limb Concept с контрастным белым логотипом\nцена: 65 BYN // 1950 RUB\nразмер: L\nсостояние: Отличное селективное\n\nПодпишись на наш тг: Lavkazombie",
    "price": 65,
    "currency": "BYN",
    "category": "hoodies",
    "sizes": [
      "L"
    ],
    "images": [
      "/assets/products/tg-9.webp"
    ],
    "era": "Streetwear / Modern",
    "condition": "Отличное селективное",
    "status": "published",
    "inStock": true,
    "featured": true
  }
];
