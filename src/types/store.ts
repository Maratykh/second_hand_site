export type ProductCategory = 'jackets' | 'tshirts' | 'pants' | 'hoodies' | 'accessories';

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
  { key: 'jackets', label: 'Куртки и верхняя одежда' },
  { key: 'tshirts', label: 'Футболки и лонгсливы' },
  { key: 'pants', label: 'Джинсы и брюки' },
  { key: 'hoodies', label: 'Худи и свитшоты' },
  { key: 'accessories', label: 'Аксессуары' },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  jackets: 'Куртки',
  tshirts: 'Футболки',
  pants: 'Джинсы и брюки',
  hoodies: 'Худи и свитшоты',
  accessories: 'Аксессуары',
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
