export type ProductCategory =
  | 'jackets'
  | 'tshirts'
  | 'pants'
  | 'hoodies'
  | 'shoes'
  | 'accessories';

export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'ONE SIZE';

export type ProductStatus = 'draft' | 'published';

export type DeliveryMethod = 'post' | 'europost' | 'cdek';

export type OrderStatus = 'new' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';

export interface ProductMeasurements {
  length?: string;
  width?: string;
  sleeve?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: 'BYN';
  category: ProductCategory;
  sizes: ProductSize[];
  images: string[];
  era: string;
  condition: string;
  measurements?: ProductMeasurements;
  status: ProductStatus;
  inStock: boolean;
  featured: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  size: ProductSize;
  quantity: number;
  image: string;
  category: ProductCategory;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  size: ProductSize;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  comment: string;
  items: OrderItem[];
  totalAmount: number;
  currency: 'BYN';
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CheckoutFormInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  comment: string;
}

export const BRAND_INFO = {
  name: 'Лавка Зомби',
  latinName: 'Lavka Zombie',
  tagline: 'Селективный магазин винтажной одежды по доступным ценам. Еженедельные большие обновления!',
  address: 'г. Минск, ул. Веры Хоружей 3, офис 308',
  hoursWeekdays: 'Пн–Пт: 11:00 – 20:00',
  hoursWeekend: 'Сб–Вс: 11:00 – 19:00',
  deliverySummary: 'Отправляем почтой / Европочтой по РБ и СДЭКом в РФ.',
  supportHandle: '@NikitaZombie',
  supportUrl: 'https://t.me/NikitaZombie',
  vkOwnerId: '-139575762',
  reviewsUrl: 'https://vk.com/albums-139575762',
  socials: {
    telegram: 'http://t.me/lavkazombie',
    vk: 'https://vk.com/albums-139575762',
    instagram: 'https://www.instagram.com/lavkazombie/',
    tiktok: '@lavkazombie',
    tiktokUrl: 'https://www.tiktok.com/@lavkazombie',
  },
} as const;

export const ADMIN_EMAIL = 'gotdehgot@gmail.com';

export const PRODUCT_CATEGORIES: { key: ProductCategory; label: string }[] = [
  { key: 'jackets', label: 'Куртки' },
  { key: 'tshirts', label: 'Футболки и майки' },
  { key: 'hoodies', label: 'Худи и свитшоты' },
  { key: 'pants', label: 'Джинсы и брюки' },
  { key: 'shoes', label: 'Кроссовки' },
  { key: 'accessories', label: 'Аксессуары' },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  jackets: 'Куртки',
  tshirts: 'Футболки и майки',
  hoodies: 'Худи и свитшоты',
  pants: 'Джинсы и брюки',
  shoes: 'Кроссовки',
  accessories: 'Аксессуары',
};

export interface SubCategoryDef {
  key: string;
  label: string;
  match: (title: string, description: string) => boolean;
}

export const CATEGORY_SUBCATEGORIES: Record<ProductCategory, SubCategoryDef[]> = {
  tshirts: [
    {
      key: 'maiki',
      label: 'Майки',
      match: (t, d) => /майка|tank\s*top|безрукав/i.test(`${t} ${d}`),
    },
    {
      key: 'polo',
      label: 'Поло',
      match: (t, d) => /поло|polo/i.test(`${t} ${d}`),
    },
    {
      key: 'tshirts_classic',
      label: 'Футболки',
      match: (t, d) => /футболк|tee|t-shirt/i.test(`${t} ${d}`) || !/майка|поло|лонгслив/i.test(`${t} ${d}`),
    },
    {
      key: 'longsleeves',
      label: 'Лонгсливы',
      match: (t, d) => /лонгслив|long\s*sleeve/i.test(`${t} ${d}`),
    },
  ],
  shoes: [
    {
      key: 'sneakers',
      label: 'Кроссовки',
      match: (t, d) => /кроссов|sneakers|runner/i.test(`${t} ${d}`),
    },
    {
      key: 'skate_shoes',
      label: 'Кеды',
      match: (t, d) => /кед|vans|converse|dunk/i.test(`${t} ${d}`),
    },
  ],
  accessories: [
    {
      key: 'bags',
      label: 'Сумки & Рюкзаки',
      match: (t, d) => /сумк|шопер|шоппер|рюкзак|мешок|bag|backpack/i.test(`${t} ${d}`),
    },
    {
      key: 'eyewear',
      label: 'Очки',
      match: (t, d) => /очк|glasses|sunglasses/i.test(`${t} ${d}`),
    },
    {
      key: 'headwear',
      label: 'Кепки & Шапки',
      match: (t, d) => /шапк|кепк|кепи|панам|бейсболк|beanie|cap|hat/i.test(`${t} ${d}`),
    },
    {
      key: 'jewelry_belts',
      label: 'Украшения & Ремни',
      match: (t, d) => /кольц|ремен|цеп|браслет|значок|ring|belt/i.test(`${t} ${d}`),
    },
  ],
  pants: [
    {
      key: 'jeans',
      label: 'Джинсы',
      match: (t, d) => /джинс|denim|jean/i.test(`${t} ${d}`),
    },
    {
      key: 'shorts',
      label: 'Шорты',
      match: (t, d) => /шорт|short/i.test(`${t} ${d}`),
    },
    {
      key: 'pants_cargo',
      label: 'Штаны & Брюки',
      match: (t, d) => /штан|брюк|карго|cargo|pant/i.test(`${t} ${d}`) && !/шорт/i.test(`${t} ${d}`),
    },
  ],
  hoodies: [
    {
      key: 'hoodies_zip',
      label: 'Худи & Зипки',
      match: (t, d) => /худи|hoodie|зип/i.test(`${t} ${d}`),
    },
    {
      key: 'sweatshirts',
      label: 'Свитшоты',
      match: (t, d) => /свитшот|sweatshirt|crewneck/i.test(`${t} ${d}`),
    },
    {
      key: 'sweaters',
      label: 'Свитеры',
      match: (t, d) => /свитер|джемпер|кофт|вязаный|knit|sweater/i.test(`${t} ${d}`),
    },
  ],
  jackets: [
    {
      key: 'windbreakers',
      label: 'Ветровки',
      match: (t, d) => /ветровк|дождевик|windbreaker|анорак/i.test(`${t} ${d}`),
    },
    {
      key: 'bombers',
      label: 'Бомберы',
      match: (t, d) => /бомбер|bomber|varsity/i.test(`${t} ${d}`),
    },
    {
      key: 'leather_denim',
      label: 'Кожа & Джинс',
      match: (t, d) => /кож|косух|джинсовк|leather/i.test(`${t} ${d}`),
    },
  ],
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
};

export const ALL_SIZES: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'];

export const DELIVERY_METHODS: { key: DeliveryMethod; label: string; note: string }[] = [
  { key: 'europost', label: 'Европочта (Беларусь)', note: '2–3 рабочих дня до отделения, оплата при получении' },
  { key: 'post', label: 'Белпочта (Беларусь)', note: '2–4 рабочих дня по всей РБ' },
  { key: 'cdek', label: 'СДЭК (Доставка в РФ)', note: '3–7 рабочих дней до ПВЗ или двери в России' },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  shipped: 'Отправлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

// Synchronized verbatim with firebase-blueprint.json constraints
export const SCHEMA_LIMITS = {
  productTitleMax: 140,
  productDescMax: 2000,
  productPriceMax: 100000,
  productSizesMax: 10,
  productImagesMax: 8,
  productEraMax: 40,
  productConditionMax: 80,
  productMeasurementMax: 32,
  orderNameMax: 100,
  orderPhoneMax: 32,
  orderEmailMax: 120,
  orderAddressMax: 300,
  orderCommentMax: 500,
  orderItemsMax: 30,
} as const;
