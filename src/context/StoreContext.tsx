import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, googleProvider, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { SEED_PRODUCTS } from '../data/seedProducts';
import type {
  CartItem,
  CheckoutFormInput,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  ProductSize,
  ProductStatus,
} from '../types/store';
import { ADMIN_EMAIL, SCHEMA_LIMITS } from '../types/store';
import {
  addToCartList,
  buildDraftProductFromVkPhoto,
  buildDraftProductFromVkItem,
  calculateCartSummary,
  generateOrderNumber,
  removeFromCartList,
  sanitizeImageUrl,
  sanitizeMeasurements,
  toggleIdInList,
  updateCartItemQuantity,
} from '../utils/storeLogic';

const LOCAL_CART_KEY = 'lavka_zombie_cart_v1';
const LOCAL_ORDERS_KEY = 'lavka_zombie_recent_orders_v1';
const LOCAL_FITTINGS_KEY = 'lavka_zombie_fittings_v1';
const LOCAL_FITTING_NOTES_KEY = 'lavka_zombie_fitting_notes_v1';
const LOCAL_WISHLIST_KEY = 'lavka_zombie_wishlist_v1';

interface StoreContextValue {
  // Auth
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Catalog
  products: Product[]; // Published storefront products only
  adminProducts: Product[]; // All products including drafts for Admin Panel
  productsLoading: boolean;
  usingFallbackSeed: boolean;
  seedInitialProductsToDb: () => Promise<number>;
  saveProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<string>;
  setProductStatus: (productId: string, status: ProductStatus) => Promise<void>;
  setProductInStock: (productId: string, inStock: boolean) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  uploadProductImage: (file: File) => Promise<string>;
  importVkDrafts: (imageUrls: string[]) => Promise<number>;
  importVkItems: (
    items: Array<{
      title?: string;
      price?: number;
      size?: ProductSize;
      category?: ProductCategory;
      description?: string;
      image: string;
      measurements?: ProductMeasurements;
    }>
  ) => Promise<number>;

  // Cart
  cart: CartItem[];
  cartSummary: { totalItems: number; totalAmount: number };
  addToCart: (product: Product, size: ProductSize, quantity?: number) => void;
  updateCartQty: (productId: string, size: ProductSize, delta: number) => void;
  removeFromCart: (productId: string, size: ProductSize) => void;
  clearCart: () => void;

  // Fitting Notebook ("Хочу померить") & Wishlist ("Избранное")
  fittingIds: string[];
  fittingNotes: Record<string, string>;
  toggleFitting: (product: Product) => void;
  setFittingNote: (productId: string, note: string) => void;
  clearFittings: () => void;
  wishlistIds: string[];
  toggleWishlist: (product: Product) => void;
  clearWishlist: () => void;

  // Orders
  userOrders: Order[];
  adminOrders: Order[];
  newOrdersCount: number;
  placeOrder: (input: CheckoutFormInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;

  // Feedback toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadLocalArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function loadLocalRecord(key: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function createSafeDocId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [publishedFirestoreProducts, setPublishedFirestoreProducts] = useState<Product[]>([]);
  const [adminFirestoreProducts, setAdminFirestoreProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => loadLocalArray<CartItem>(LOCAL_CART_KEY));
  const [fittingIds, setFittingIds] = useState<string[]>(() =>
    loadLocalArray<string>(LOCAL_FITTINGS_KEY)
  );
  const [fittingNotes, setFittingNotes] = useState<Record<string, string>>(() =>
    loadLocalRecord(LOCAL_FITTING_NOTES_KEY)
  );
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    loadLocalArray<string>(LOCAL_WISHLIST_KEY)
  );
  const [userOrders, setUserOrders] = useState<Order[]>(() =>
    loadLocalArray<Order>(LOCAL_ORDERS_KEY)
  );
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_FITTINGS_KEY, JSON.stringify(fittingIds));
    } catch {
      // ignore storage quota errors
    }
  }, [fittingIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_FITTING_NOTES_KEY, JSON.stringify(fittingNotes));
    } catch {
      // ignore storage quota errors
    }
  }, [fittingNotes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore storage quota errors
    }
  }, [wishlistIds]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);

      if (!nextUser) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      const emailMatch =
        nextUser.emailVerified && nextUser.email?.toLowerCase() === ADMIN_EMAIL;

      if (emailMatch) {
        setIsAdmin(true);
      } else {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch {
          setIsAdmin(false);
        }
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', nextUser.uid));
        if (userSnap.exists()) {
          const remoteCart = userSnap.data()?.cart;
          if (Array.isArray(remoteCart) && remoteCart.length > 0) {
            setCart((prev) => (prev.length > 0 ? prev : (remoteCart as CartItem[])));
          }
        }
      } catch {
        // created lazily on cart sync
      }

      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;
    const timeout = window.setTimeout(async () => {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            displayName: (user.displayName || 'Покупатель').slice(0, 100),
            email: (user.email || '').slice(0, 120),
            cart: cart.slice(0, SCHEMA_LIMITS.orderItemsMax),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Cart cloud sync skipped:', err);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [cart, user, authReady]);

  // Public storefront listener: strictly published products only (matches firestore.rules)
  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Product[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Product, 'id'>),
          }))
          .sort((a, b) => {
            const ta = (a.createdAt as { seconds?: number })?.seconds || 0;
            const tb = (b.createdAt as { seconds?: number })?.seconds || 0;
            return tb - ta;
          });
        setPublishedFirestoreProducts(loaded);
        setProductsLoading(false);
      },
      (error) => {
        console.error('Products snapshot error:', error);
        setProductsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Authenticated user's personal order history
  useEffect(() => {
    if (!authReady || !user) return;
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loaded: Order[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
          .sort((a, b) => {
            const ta = (a.createdAt as { seconds?: number })?.seconds || 0;
            const tb = (b.createdAt as { seconds?: number })?.seconds || 0;
            return tb - ta;
          });
        setUserOrders(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );
    return () => unsub();
  }, [authReady, user]);

  // Admin-only listeners: all products (including drafts) & all orders
  useEffect(() => {
    if (!authReady || !user || !isAdmin) {
      setAdminFirestoreProducts([]);
      setAdminOrders([]);
      return;
    }

    const unsubAllProducts = onSnapshot(
      query(collection(db, 'products'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setAdminFirestoreProducts(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setAdminOrders(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    return () => {
      unsubAllProducts();
      unsubOrders();
    };
  }, [authReady, user, isAdmin]);

  const usingFallbackSeed =
    !productsLoading &&
    publishedFirestoreProducts.length === 0 &&
    adminFirestoreProducts.length === 0;
  const products = usingFallbackSeed ? SEED_PRODUCTS : publishedFirestoreProducts;
  const adminProducts = usingFallbackSeed ? SEED_PRODUCTS : adminFirestoreProducts;

  const cartSummary = useMemo(() => calculateCartSummary(cart), [cart]);

  const newOrdersCount = useMemo(
    () => adminOrders.filter((o) => o.status === 'new').length,
    [adminOrders]
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Вы успешно вошли через Google');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка авторизации через Google';
      setAuthError(msg);
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUserOrders(loadLocalArray<Order>(LOCAL_ORDERS_KEY));
    showToast('Вы вышли из аккаунта');
  }, [showToast]);

  const addToCart = useCallback(
    (product: Product, size: ProductSize, quantity = 1) => {
      setCart((prev) => addToCartList(prev, product, size, quantity));
      showToast(`Добавлено в корзину: ${product.title || 'Товар'} (${size})`);
    },
    [showToast]
  );

  const updateCartQty = useCallback((productId: string, size: ProductSize, delta: number) => {
    setCart((prev) => updateCartItemQuantity(prev, productId, size, delta));
  }, []);

  const removeFromCart = useCallback((productId: string, size: ProductSize) => {
    setCart((prev) => removeFromCartList(prev, productId, size));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleFitting = useCallback(
    (product: Product) => {
      setFittingIds((prev) => {
        const exists = prev.includes(product.id);
        const next = toggleIdInList(prev, product.id);
        showToast(
          exists
            ? `Убрано из примерок: ${product.title}`
            : `Добавлено в «Хочу померить»: ${product.title}`
        );
        return next;
      });
    },
    [showToast]
  );

  const setFittingNote = useCallback((productId: string, note: string) => {
    setFittingNotes((prev) => {
      const next = { ...prev };
      const trimmed = note.slice(0, 200);
      if (trimmed.length === 0) {
        delete next[productId];
      } else {
        next[productId] = trimmed;
      }
      return next;
    });
  }, []);

  const clearFittings = useCallback(() => {
    setFittingIds([]);
    setFittingNotes({});
    showToast('Список примерок очищен');
  }, [showToast]);

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(product.id);
        const next = toggleIdInList(prev, product.id);
        showToast(
          exists
            ? `Убрано из избранного: ${product.title}`
            : `Добавлено в избранное: ${product.title}`
        );
        return next;
      });
    },
    [showToast]
  );

  const clearWishlist = useCallback(() => {
    setWishlistIds([]);
    showToast('Избранное очищено');
  }, [showToast]);

  const placeOrder = useCallback(
    async (input: CheckoutFormInput): Promise<Order> => {
      if (cart.length === 0) {
        throw new Error('Корзина пуста');
      }

      const orderId = createSafeDocId('ord');
      const orderNumber = generateOrderNumber();
      const summary = calculateCartSummary(cart);
      const userId = user && user.emailVerified ? user.uid : 'guest';

      const payload = {
        orderNumber,
        userId,
        customerName: input.customerName.trim().slice(0, SCHEMA_LIMITS.orderNameMax),
        customerPhone: input.customerPhone.trim().slice(0, SCHEMA_LIMITS.orderPhoneMax),
        customerEmail: input.customerEmail.trim().slice(0, SCHEMA_LIMITS.orderEmailMax),
        deliveryAddress: input.deliveryAddress.trim().slice(0, SCHEMA_LIMITS.orderAddressMax),
        deliveryMethod: input.deliveryMethod,
        comment: input.comment.trim().slice(0, SCHEMA_LIMITS.orderCommentMax),
        items: cart.slice(0, SCHEMA_LIMITS.orderItemsMax).map((c) => ({
          productId: c.productId,
          title: c.title,
          price: c.price,
          size: c.size,
          quantity: c.quantity,
          image: c.image,
        })),
        totalAmount: summary.totalAmount,
        currency: 'BYN' as const,
        status: 'new' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'orders', orderId), payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
      }

      const createdOrder: Order = {
        id: orderId,
        ...payload,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) },
      };

      if (!user) {
        const updatedLocal = [createdOrder, ...loadLocalArray<Order>(LOCAL_ORDERS_KEY)].slice(0, 15);
        try {
          window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedLocal));
        } catch {
          // ignore
        }
        setUserOrders(updatedLocal);
      }

      setCart([]);
      showToast(`Заказ ${orderNumber} оформлен!`);
      return createdOrder;
    },
    [cart, user, showToast]
  );

  const seedInitialProductsToDb = useCallback(async (): Promise<number> => {
    const batch = writeBatch(db);
    for (const item of SEED_PRODUCTS) {
      const refDoc = doc(db, 'products', item.id);
      const cleanMeasurements = sanitizeMeasurements(item.measurements);
      batch.set(refDoc, {
        title: item.title,
        description: item.description,
        price: item.price,
        currency: 'BYN',
        category: item.category,
        sizes: item.sizes,
        images: item.images,
        era: item.era,
        condition: item.condition,
        ...(cleanMeasurements ? { measurements: cleanMeasurements } : {}),
        status: 'published',
        inStock: item.inStock,
        featured: item.featured,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      showToast(`Загружено ${SEED_PRODUCTS.length} стартовых позиций в Firestore`);
      return SEED_PRODUCTS.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  }, [showToast]);

  const saveProduct = useCallback(
    async (
      data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<string> => {
      const productId = existingId || createSafeDocId('prod');
      const cleanImages = data.images
        .map((url) => sanitizeImageUrl(url))
        .filter((url): url is string => Boolean(url))
        .slice(0, SCHEMA_LIMITS.productImagesMax);

      if (cleanImages.length === 0) {
        throw new Error('Добавьте хотя бы одно корректное изображение товара.');
      }

      const targetStatus: ProductStatus = data.status === 'draft' ? 'draft' : 'published';
      const cleanMeasurements = sanitizeMeasurements(data.measurements);

      const basePayload = {
        title: data.title.trim().slice(0, SCHEMA_LIMITS.productTitleMax),
        description: data.description.trim().slice(0, SCHEMA_LIMITS.productDescMax),
        price: Math.max(0, Math.min(SCHEMA_LIMITS.productPriceMax, Number(data.price) || 0)),
        currency: 'BYN' as const,
        category: data.category as ProductCategory,
        sizes: data.sizes.slice(0, SCHEMA_LIMITS.productSizesMax),
        images: cleanImages,
        era: (data.era || '').trim().slice(0, SCHEMA_LIMITS.productEraMax),
        condition: (data.condition || '').trim().slice(0, SCHEMA_LIMITS.productConditionMax),
        measurements: cleanMeasurements ?? {},
        status: targetStatus,
        inStock: Boolean(data.inStock),
        featured: Boolean(data.featured),
        updatedAt: serverTimestamp(),
      };

      const docRef = doc(db, 'products', productId);
      try {
        if (existingId && adminFirestoreProducts.some((p) => p.id === existingId)) {
          await updateDoc(docRef, basePayload);
          showToast(
            basePayload.status === 'published' ? 'Товар опубликован на сайте' : 'Черновик сохранён'
          );
        } else {
          await setDoc(docRef, {
            ...basePayload,
            createdAt: serverTimestamp(),
          });
          showToast(
            basePayload.status === 'published' ? 'Товар добавлен и опубликован' : 'Черновик создан'
          );
        }
        return productId;
      } catch (error) {
        handleFirestoreError(
          error,
          existingId ? OperationType.UPDATE : OperationType.CREATE,
          `products/${productId}`
        );
      }
    },
    [adminFirestoreProducts, showToast]
  );

  const setProductStatus = useCallback(
    async (productId: string, status: ProductStatus) => {
      try {
        await updateDoc(doc(db, 'products', productId), {
          status,
          updatedAt: serverTimestamp(),
        });
        showToast(
          status === 'published' ? 'Товар опубликован на сайте' : 'Товар переведён в черновики'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
      }
    },
    [showToast]
  );

  const setProductInStock = useCallback(
    async (productId: string, inStock: boolean) => {
      try {
        await updateDoc(doc(db, 'products', productId), {
          inStock,
          updatedAt: serverTimestamp(),
        });
        showToast(
          inStock ? 'Товар отмечен: «В наличии»' : 'Товар отмечен: «ПРОДАНО»'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
      }
    },
    [showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      try {
        await deleteDoc(doc(db, 'products', productId));
        showToast('Товар удалён из каталога');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      }
    },
    [showToast]
  );

  const uploadProductImage = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Поддерживаются только изображения (JPG, PNG, WEBP).');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Максимальный размер фото — 5 МБ.');
    }
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const filePath = `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }, []);

  const importVkDrafts = useCallback(
    async (imageUrls: string[]): Promise<number> => {
      const existingBaseUrls = new Set(
        adminFirestoreProducts
          .map((p) => (p.images[0] || '').split('?')[0])
          .filter(Boolean)
      );

      const drafts = imageUrls
        .filter((url) => !existingBaseUrls.has(url.split('?')[0]))
        .map((url) => buildDraftProductFromVkPhoto(url))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));

      if (drafts.length === 0) {
        showToast('Все найденные фото из этого альбома уже есть в черновиках');
        return 0;
      }

      const CHUNK_SIZE = 25;
      try {
        for (let i = 0; i < drafts.length; i += CHUNK_SIZE) {
          const chunk = drafts.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const draft of chunk) {
            const docId = createSafeDocId('draft');
            batch.set(doc(db, 'products', docId), {
              ...draft,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }
        showToast(`Сохранено ${drafts.length} фото-черновиков из ВК`);
        return drafts.length;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      }
    },
    [adminFirestoreProducts, showToast]
  );

  const importVkItems = useCallback(
    async (
      items: Array<{
        title?: string;
        price?: number;
        size?: ProductSize;
        category?: ProductCategory;
        description?: string;
        image: string;
        measurements?: ProductMeasurements;
      }>
    ): Promise<number> => {
      const existingBaseUrls = new Set(
        adminFirestoreProducts
          .map((p) => (p.images[0] || '').split('?')[0])
          .filter(Boolean)
      );

      const drafts = items
        .filter((item) => item.image && !existingBaseUrls.has(item.image.split('?')[0]))
        .map((item) => buildDraftProductFromVkItem(item))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));

      if (drafts.length === 0) {
        showToast('Все найденные товары из этого альбома уже добавлены');
        return 0;
      }

      const CHUNK_SIZE = 25;
      try {
        for (let i = 0; i < drafts.length; i += CHUNK_SIZE) {
          const chunk = drafts.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const draft of chunk) {
            const docId = createSafeDocId('draft');
            batch.set(doc(db, 'products', docId), {
              ...draft,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }
        showToast(`Успешно добавлено ${drafts.length} товаров из альбома ВК!`);
        return drafts.length;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      }
    },
    [adminFirestoreProducts, showToast]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status,
          updatedAt: serverTimestamp(),
        });
        showToast('Статус заказа обновлён');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    },
    [showToast]
  );

  const value: StoreContextValue = {
    user,
    authReady,
    isAdmin,
    authError,
    signInWithGoogle,
    signOutUser,
    products,
    adminProducts,
    productsLoading,
    usingFallbackSeed,
    seedInitialProductsToDb,
    saveProduct,
    setProductStatus,
    setProductInStock,
    deleteProduct,
    uploadProductImage,
    importVkDrafts,
    importVkItems,
    cart,
    cartSummary,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    fittingIds,
    fittingNotes,
    toggleFitting,
    setFittingNote,
    clearFittings,
    wishlistIds,
    toggleWishlist,
    clearWishlist,
    userOrders,
    adminOrders,
    newOrdersCount,
    placeOrder,
    updateOrderStatus,
    toastMessage,
    showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
