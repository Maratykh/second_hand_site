import type {
  CartItem,
  CheckoutFormInput,
  Product,
  ProductCategory,
  ProductMeasurements,
  ProductSize,
  ProductStatus,
} from '../types/store';
import { SCHEMA_LIMITS } from '../types/store';

export interface CatalogFilters {
  category: ProductCategory | 'all';
  size: ProductSize | 'all';
  search: string;
  sort: 'newest' | 'price-asc' | 'price-desc';
  onlyInStock: boolean;
}

export function filterAndSortProducts(products: Product[], filters: CatalogFilters): Product[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = products.filter((product) => {
    // Public storefront catalog strictly hides draft products
    if (product.status === 'draft') return false;
    if (filters.onlyInStock && !product.inStock) return false;
    if (filters.category !== 'all' && product.category !== filters.category) return false;
    if (filters.size !== 'all' && !product.sizes.includes(filters.size)) return false;
    if (query.length > 0) {
      const haystack = `${product.title} ${product.description} ${product.era}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'price-asc') return a.price - b.price;
    if (filters.sort === 'price-desc') return b.price - a.price;
    return 0;
  });
}

export function toggleIdInList(list: string[], id: string): string[] {
  if (!id) return list;
  return list.includes(id) ? list.filter((item) => item !== id) : [id, ...list];
}

export interface ProductFormData {
  title: string;
  price: string | number;
  sizes: ProductSize[];
  images: string[];
  status: ProductStatus;
}

export function validateProductFormData(data: ProductFormData): { valid: boolean; error?: string } {
  const trimmedTitle = (data.title || '').trim();
  if (data.status === 'published' && trimmedTitle.length < 2) {
    return { valid: false, error: 'Для публикации укажите название товара (минимум 2 символа).' };
  }

  const numPrice = typeof data.price === 'number' ? data.price : Number(data.price);
  if (!Number.isFinite(numPrice) || numPrice < 0 || numPrice > SCHEMA_LIMITS.productPriceMax) {
    return { valid: false, error: 'Укажите корректную цену в BYN.' };
  }
  if (data.status === 'published' && numPrice <= 0) {
    return { valid: false, error: 'Для публикации на сайте укажите цену больше 0 BYN.' };
  }

  if (!data.sizes || data.sizes.length === 0) {
    return { valid: false, error: 'Выберите хотя бы один размер.' };
  }

  if (!data.images || data.images.length === 0) {
    return { valid: false, error: 'Добавьте хотя бы одно изображение (загрузите файл или укажите URL).' };
  }

  return { valid: true };
}

export function sanitizeMeasurements(
  input?: ProductMeasurements
): ProductMeasurements | undefined {
  if (!input) return undefined;
  const length = (input.length || '').trim().slice(0, SCHEMA_LIMITS.productMeasurementMax);
  const width = (input.width || '').trim().slice(0, SCHEMA_LIMITS.productMeasurementMax);
  const sleeve = (input.sleeve || '').trim().slice(0, SCHEMA_LIMITS.productMeasurementMax);

  const result: ProductMeasurements = {};
  if (length) result.length = length;
  if (width) result.width = width;
  if (sleeve) result.sleeve = sleeve;

  return Object.keys(result).length > 0 ? result : undefined;
}

export function formatMeasurementValue(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    return `${trimmed} см`;
  }
  return trimmed;
}

export function addToCartList(
  cart: CartItem[],
  product: Product,
  size: ProductSize,
  quantity = 1
): CartItem[] {
  const safeQty = Math.max(1, Math.min(10, Math.floor(quantity)));
  const existingIdx = cart.findIndex(
    (item) => item.productId === product.id && item.size === size
  );

  if (existingIdx >= 0) {
    return cart.map((item, idx) =>
      idx === existingIdx
        ? { ...item, quantity: Math.min(10, item.quantity + safeQty) }
        : item
    );
  }

  if (cart.length >= SCHEMA_LIMITS.orderItemsMax) {
    return cart;
  }

  return [
    ...cart,
    {
      productId: product.id,
      title: product.title,
      price: product.price,
      size,
      quantity: safeQty,
      image: product.images[0] || '',
      category: product.category,
    },
  ];
}

export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  size: ProductSize,
  delta: number
): CartItem[] {
  return cart
    .map((item) => {
      if (item.productId === productId && item.size === size) {
        const nextQty = item.quantity + delta;
        return { ...item, quantity: Math.min(10, nextQty) };
      }
      return item;
    })
    .filter((item) => item.quantity > 0);
}

export function removeFromCartList(
  cart: CartItem[],
  productId: string,
  size: ProductSize
): CartItem[] {
  return cart.filter((item) => !(item.productId === productId && item.size === size));
}

export function calculateCartSummary(cart: CartItem[]): {
  totalItems: number;
  totalAmount: number;
} {
  return cart.reduce(
    (acc, item) => ({
      totalItems: acc.totalItems + item.quantity,
      totalAmount: Math.round((acc.totalAmount + item.price * item.quantity) * 100) / 100,
    }),
    { totalItems: 0, totalAmount: 0 }
  );
}

export function formatPriceBYN(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return `${safe.toLocaleString('ru-RU')} BYN`;
}

export interface CheckoutValidationErrors {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  deliveryMethod?: string;
  comment?: string;
}

export function validateCheckoutForm(input: CheckoutFormInput): CheckoutValidationErrors {
  const errors: CheckoutValidationErrors = {};
  const name = input.customerName.trim();
  const phone = input.customerPhone.trim();
  const email = input.customerEmail.trim();
  const address = input.deliveryAddress.trim();
  const comment = input.comment.trim();

  if (name.length < 2) {
    errors.customerName = 'Укажите имя и фамилию (минимум 2 символа)';
  } else if (name.length > SCHEMA_LIMITS.orderNameMax) {
    errors.customerName = `Максимум ${SCHEMA_LIMITS.orderNameMax} символов`;
  }

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || phone.length > SCHEMA_LIMITS.orderPhoneMax) {
    errors.customerPhone = 'Введите корректный номер телефона (например, +375 29 123-45-67)';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > SCHEMA_LIMITS.orderEmailMax) {
    errors.customerEmail = 'Введите корректный email адрес';
  }

  if (address.length < 5) {
    errors.deliveryAddress = 'Укажите город, адрес или номер отделения доставки';
  } else if (address.length > SCHEMA_LIMITS.orderAddressMax) {
    errors.deliveryAddress = `Максимум ${SCHEMA_LIMITS.orderAddressMax} символов`;
  }

  if (!['post', 'europost', 'cdek'].includes(input.deliveryMethod)) {
    errors.deliveryMethod = 'Выберите способ доставки';
  }

  if (comment.length > SCHEMA_LIMITS.orderCommentMax) {
    errors.comment = `Комментарий не должен превышать ${SCHEMA_LIMITS.orderCommentMax} символов`;
  }

  return errors;
}

export function generateOrderNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LZ-${yy}${mm}${dd}-${suffix}`;
}

export function sanitizeImageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 1000) return null;
  if (trimmed.startsWith('/src/assets/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export {
  extractVkPhotosFromAlPhotosPayload,
  extractVkPublicAlbumPhotoUrls,
  isVkAlbumsListUrl,
  normalizeVkPhotoUrl,
  parseVkAlbumInput,
} from './vkAlbumParser';

export function buildDraftProductFromVkPhoto(
  imageUrl: string
): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null {
  const safeImage = sanitizeImageUrl(imageUrl);
  if (!safeImage) return null;

  return {
    title: '',
    description: '',
    price: 0,
    currency: 'BYN',
    category: 'jackets',
    sizes: ['ONE SIZE'],
    images: [safeImage],
    era: '',
    condition: '',
    status: 'draft',
    inStock: true,
    featured: false,
  };
}

export function buildDraftProductFromVkItem(item: {
  title?: string;
  description?: string;
  price?: number;
  size?: ProductSize;
  category?: ProductCategory;
  image: string;
  measurements?: ProductMeasurements;
}): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null {
  const safeImage = sanitizeImageUrl(item.image);
  if (!safeImage) return null;

  return {
    title: (item.title || '').trim().slice(0, 140),
    description: (item.description || '').trim().slice(0, 2000),
    price: Math.max(0, Math.min(100000, Math.round(Number(item.price) || 0))),
    currency: 'BYN',
    category: item.category || 'hoodies',
    sizes: item.size ? [item.size] : ['ONE SIZE'],
    images: [safeImage],
    era: 'Винтаж',
    condition: 'Отличное',
    measurements: item.measurements,
    status: 'draft',
    inStock: true,
    featured: false,
  };
}

export function buildProductDownloadFilename(title: string, index = 0): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = index > 0 ? `-${index + 1}` : '';
  return `${clean || 'lavka-zombie-item'}${suffix}.jpg`;
}
