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
  arrayUnion,
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
  ProductMeasurements,
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
import {
  checkAdminSession,
  clearAdminSession,
  verifyAdminCredentials,
  changeAdminPassword as changeAdminPassUtil,
  getAdminHash,
} from '../utils/adminAuth';

const LOCAL_CART_KEY = 'lavka_zombie_cart_v1';
const LOCAL_ORDERS_KEY = 'lavka_zombie_recent_orders_v1';
const LOCAL_FITTINGS_KEY = 'lavka_zombie_fittings_v1';
const LOCAL_FITTING_NOTES_KEY = 'lavka_zombie_fitting_notes_v1';
const LOCAL_WISHLIST_KEY = 'lavka_zombie_wishlist_v1';
const LOCAL_STOCK_OVERRIDES_KEY = 'zombie_stock_overrides_v1';
const LOCAL_DELETED_KEY = 'zombie_deleted_products_v1';
const LOCAL_OVERRIDES_KEY = 'zombie_product_overrides_v1';
const LOCAL_CUSTOM_PRODUCTS_KEY = 'zombie_custom_products_v1';
const LOCAL_HERO_KEY = 'zombie_hero_settings_v2';
const LOCAL_PROMO_KEY = 'zombie_promo_settings_v1';
const LOCAL_INTEREST_KEY = 'zombie_interest_stats_v1';

export interface HeroSettings {
  badge: string;
  title: string;
  description: string;
  bannerImage: string;
  featuredProductIds?: string[];
}

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  badge: 'Минск · ул. Веры Хоружей 3, оф. 308',
  title: 'Селективный винтаж & архив',
  description: 'Оригинальные вещи 80-х, 90-х и Y2K штучного селектива. Европейский и американский архив с еженедельными дропами.',
  bannerImage: '/assets/images/hero_banner.jpg',
};

export interface PromoBannerSettings {
  enabled: boolean;
  text: string;
  badge?: string;
  linkText?: string;
  linkUrl?: string;
}

export const DEFAULT_PROMO_SETTINGS: PromoBannerSettings = {
  enabled: true,
  badge: '🔥 СВЕЖИЙ ДРОП',
  text: 'Большой завоз архивных курток и свитшотов! Ждём на примерку на ул. Веры Хоружей 3',
  linkText: 'Смотреть каталог →',
  linkUrl: '#/catalog',
};

interface StoreContextValue {
  // Auth
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  loginAdminWithPassword: (
    username: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  changeAdminPassword: (newPassword: string) => Promise<boolean>;

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
  validFittingCount: number;
  fittingNotes: Record<string, string>;
  toggleFitting: (product: Product) => void;
  setFittingNote: (productId: string, note: string) => void;
  clearFittings: () => void;
  wishlistIds: string[];
  validWishlistCount: number;
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

  // Hero Banner Customization
  heroSettings: HeroSettings;
  updateHeroSettings: (settings: Partial<HeroSettings>) => void;
  resetHeroSettings: () => void;

  // Promo Banner Customization
  promoSettings: PromoBannerSettings;
  updatePromoSettings: (settings: Partial<PromoBannerSettings>) => void;
  resetPromoSettings: () => void;

  // Custom added products
  customProducts: Product[];

  // Customer Interest Analytics
  interestStats: Record<string, { fittings: number; wishlist: number }>;
  recordProductInterest: (productId: string, type: 'fitting' | 'wishlist') => void;
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
  const [isAdmin, setIsAdmin] = useState(() => checkAdminSession());
  const [authError, setAuthError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const [stockOverrides, setStockOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STOCK_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_DELETED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [productOverrides, setProductOverrides] = useState<Record<string, Partial<Product>>>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [customProducts, setCustomProducts] = useState<Product[]>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_CUSTOM_PRODUCTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [firestoreCustomProducts, setFirestoreCustomProducts] = useState<Product[]>([]);
  const [deployedCustomProducts, setDeployedCustomProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/customProducts.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Product[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setDeployedCustomProducts(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-device Realtime Sync via Firestore for ALL visitors
  useEffect(() => {
    // Immediate HTTP fetch on load
    const fsUrl = 'https://firestore.googleapis.com/v1/projects/fundamental-inverter-l91ww/databases/ai-studio-remixremix-521d0fff-033e-415a-8e15-0c73d96d03e5/documents/metadata/catalog_state?key=AIzaSyBosVDYGZUauLmHZna4Jw9Yo7TjAeEznuw';
    fetch(fsUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.fields) return;
        const rawStock = data.fields.stockOverrides?.mapValue?.fields || {};
        const stockMap: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(rawStock)) {
          stockMap[k] = (v as { booleanValue?: boolean }).booleanValue ?? false;
        }
        if (Object.keys(stockMap).length > 0) {
          setStockOverrides((prev) => ({ ...prev, ...stockMap }));
        }

        const rawDeleted = data.fields.deletedIds?.arrayValue?.values || [];
        const deletedArr: string[] = rawDeleted
          .map((v: { stringValue?: string }) => v.stringValue)
          .filter(Boolean);
        if (deletedArr.length > 0) {
          setDeletedIds((prev) => Array.from(new Set([...prev, ...deletedArr])));
        }

        if (data.fields.heroSettings?.mapValue?.fields) {
          const h = data.fields.heroSettings.mapValue.fields;
          const hero: Partial<HeroSettings> = {};
          if (h.badge?.stringValue) hero.badge = h.badge.stringValue;
          if (h.title?.stringValue) hero.title = h.title.stringValue;
          if (h.description?.stringValue) hero.description = h.description.stringValue;
          if (h.bannerImage?.stringValue) hero.bannerImage = h.bannerImage.stringValue;
          setHeroSettings((prev) => ({ ...prev, ...hero }));
        }

        if (data.fields.promoSettings?.mapValue?.fields) {
          const p = data.fields.promoSettings.mapValue.fields;
          const promo: Partial<PromoBannerSettings> = {};
          if (p.enabled !== undefined) promo.enabled = p.enabled.booleanValue ?? true;
          if (p.badge?.stringValue) promo.badge = p.badge.stringValue;
          if (p.text?.stringValue) promo.text = p.text.stringValue;
          if (p.linkText?.stringValue) promo.linkText = p.linkText.stringValue;
          if (p.linkUrl?.stringValue) promo.linkUrl = p.linkUrl.stringValue;
          setPromoSettings((prev) => ({ ...prev, ...promo }));
        }
      })
      .catch((e) => console.warn('Immediate Firestore REST fetch fallback:', e));

    try {
      const docRef = doc(db, 'metadata', 'catalog_state');
      const unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.stockOverrides && typeof data.stockOverrides === 'object') {
              setStockOverrides((prev) => {
                const merged = { ...prev, ...data.stockOverrides };
                try {
                  window.localStorage.setItem(LOCAL_STOCK_OVERRIDES_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
            if (Array.isArray(data.deletedIds)) {
              setDeletedIds((prev) => {
                const merged = Array.from(new Set([...prev, ...data.deletedIds]));
                try {
                  window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
            if (data.productOverrides && typeof data.productOverrides === 'object') {
              setProductOverrides((prev) => {
                const merged = { ...prev, ...data.productOverrides };
                try {
                  window.localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
            if (data.heroSettings && typeof data.heroSettings === 'object') {
              setHeroSettings((prev) => ({ ...prev, ...data.heroSettings }));
            }
            if (data.promoSettings && typeof data.promoSettings === 'object') {
              setPromoSettings((prev) => ({ ...prev, ...data.promoSettings }));
            }
            if (data.customProducts && typeof data.customProducts === 'object') {
              const list = Object.values(data.customProducts) as Product[];
              if (Array.isArray(list) && list.length > 0) {
                setFirestoreCustomProducts(list);
              }
            }
          }
        },
        (err) => {
          console.warn('Realtime catalog_state sync warning:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Realtime sync setup error:', e);
    }
  }, []);

  const [asyncSeedProducts, setAsyncSeedProducts] = useState<Product[]>(SEED_PRODUCTS);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/seedProducts.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Product[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setAsyncSeedProducts(data);
          setProductsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Async products load fallback:', err);
        setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [heroSettings, setHeroSettings] = useState<HeroSettings>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_HERO_KEY) || window.localStorage.getItem('zombie_hero_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bannerImage && parsed.bannerImage.includes('sun9-80.vkuserphoto.ru')) {
          parsed.bannerImage = '/assets/images/hero_banner.jpg';
        }
        if (!parsed.title || parsed.title.includes('без лишней наценки')) {
          parsed.title = DEFAULT_HERO_SETTINGS.title;
        }
        if (!parsed.description || parsed.description.includes('честный деним') || parsed.description.includes('по доступным ценам')) {
          parsed.description = DEFAULT_HERO_SETTINGS.description;
        }
        return { ...DEFAULT_HERO_SETTINGS, ...parsed };
      }
      return DEFAULT_HERO_SETTINGS;
    } catch {
      return DEFAULT_HERO_SETTINGS;
    }
  });

  // Cross-device sync: fetch deployed /data/heroSettings.json for phones & public visitors
  useEffect(() => {
    let cancelled = false;
    fetch('/data/heroSettings.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((remote: Partial<HeroSettings> | null) => {
        if (!cancelled && remote) {
          setHeroSettings((prev) => {
            const raw = window.localStorage.getItem(LOCAL_HERO_KEY) || window.localStorage.getItem('zombie_hero_settings_v1');
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed.bannerImage && parsed.bannerImage.includes('sun9-80.vkuserphoto.ru')) {
                  parsed.bannerImage = remote.bannerImage || '/assets/images/hero_banner.jpg';
                }
                if (!parsed.title || parsed.title.includes('без лишней наценки')) {
                  parsed.title = remote.title || DEFAULT_HERO_SETTINGS.title;
                }
                if (!parsed.description || parsed.description.includes('честный деним') || parsed.description.includes('по доступным ценам')) {
                  parsed.description = remote.description || DEFAULT_HERO_SETTINGS.description;
                }
                return { ...DEFAULT_HERO_SETTINGS, ...remote, ...parsed };
              } catch {}
            }
            return { ...DEFAULT_HERO_SETTINGS, ...remote };
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const updateHeroSettings = useCallback(
    async (settings: Partial<HeroSettings>) => {
      setHeroSettings((prev) => {
        const next = { ...prev, ...settings };
        try {
          window.localStorage.setItem(LOCAL_HERO_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast('Настройки главной страницы сохранены');

      try {
        const hash = getAdminHash();
        await setDoc(
          doc(db, 'metadata', 'catalog_state'),
          {
            adminHash: hash,
            heroSettings: settings,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Hero settings sync error:', err);
      }
    },
    [showToast]
  );

  const resetHeroSettings = useCallback(async () => {
    setHeroSettings(DEFAULT_HERO_SETTINGS);
    try {
      window.localStorage.removeItem(LOCAL_HERO_KEY);
    } catch {}
    showToast('Настройки афиши сброшены по умолчанию');

    try {
      const hash = getAdminHash();
      await setDoc(
        doc(db, 'metadata', 'catalog_state'),
        {
          adminHash: hash,
          heroSettings: DEFAULT_HERO_SETTINGS,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Hero reset sync error:', err);
    }
  }, [showToast]);

  const [promoSettings, setPromoSettings] = useState<PromoBannerSettings>(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_PROMO_KEY);
      return raw ? { ...DEFAULT_PROMO_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PROMO_SETTINGS;
    } catch {
      return DEFAULT_PROMO_SETTINGS;
    }
  });

  // Cross-device sync: fetch deployed /data/promoSettings.json
  useEffect(() => {
    let cancelled = false;
    fetch('/data/promoSettings.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((remote: Partial<PromoBannerSettings> | null) => {
        if (!cancelled && remote) {
          setPromoSettings((prev) => {
            const raw = window.localStorage.getItem(LOCAL_PROMO_KEY);
            if (raw) {
              try {
                return { ...DEFAULT_PROMO_SETTINGS, ...remote, ...JSON.parse(raw) };
              } catch {}
            }
            return { ...DEFAULT_PROMO_SETTINGS, ...remote };
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePromoSettings = useCallback(
    async (settings: Partial<PromoBannerSettings>) => {
      setPromoSettings((prev) => {
        const next = { ...prev, ...settings };
        try {
          window.localStorage.setItem(LOCAL_PROMO_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast('Настройки промо-строки сохранены');

      try {
        const hash = getAdminHash();
        await setDoc(
          doc(db, 'metadata', 'catalog_state'),
          {
            adminHash: hash,
            promoSettings: settings,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Promo settings sync error:', err);
      }
    },
    [showToast]
  );

  const resetPromoSettings = useCallback(async () => {
    setPromoSettings(DEFAULT_PROMO_SETTINGS);
    try {
      window.localStorage.removeItem(LOCAL_PROMO_KEY);
    } catch {}
    showToast('Промо-строка сброшена по умолчанию');

    try {
      const hash = getAdminHash();
      await setDoc(
        doc(db, 'metadata', 'catalog_state'),
        {
          adminHash: hash,
          promoSettings: DEFAULT_PROMO_SETTINGS,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Promo reset sync error:', err);
    }
  }, [showToast]);

  const [interestStats, setInterestStats] = useState<
    Record<string, { fittings: number; wishlist: number }>
  >(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_INTEREST_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      'vk-1': { fittings: 18, wishlist: 34 },
      'vk-2': { fittings: 14, wishlist: 22 },
      'vk-3': { fittings: 11, wishlist: 19 },
      'vk-4': { fittings: 9, wishlist: 16 },
      'vk-5': { fittings: 15, wishlist: 27 },
      'vk-6': { fittings: 8, wishlist: 14 },
    };
  });

  const recordProductInterest = useCallback((productId: string, type: 'fitting' | 'wishlist') => {
    setInterestStats((prev) => {
      const current = prev[productId] || { fittings: 0, wishlist: 0 };
      const next = {
        ...prev,
        [productId]: {
          ...current,
          [type === 'fitting' ? 'fittings' : 'wishlist']:
            current[type === 'fitting' ? 'fittings' : 'wishlist'] + 1,
        },
      };
      try {
        window.localStorage.setItem(LOCAL_INTEREST_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

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
        if (!checkAdminSession()) {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
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
        console.warn('Products snapshot fallback to local/seed items:', error);
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

  const baseProducts =
    publishedFirestoreProducts.length > 0 ? publishedFirestoreProducts : asyncSeedProducts;

  const baseAdminProducts =
    adminFirestoreProducts.length > 0 ? adminFirestoreProducts : asyncSeedProducts;

  const products = useMemo(() => {
    const deletedSet = new Set(deletedIds);
    const combined = [...customProducts, ...firestoreCustomProducts, ...deployedCustomProducts, ...baseProducts];
    const seen = new Set<string>();

    return combined
      .filter((p) => {
        if (seen.has(p.id) || deletedSet.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => {
        let item = p;
        if (productOverrides[p.id]) {
          item = { ...item, ...productOverrides[p.id] };
        }
        if (stockOverrides[p.id] !== undefined) {
          item = { ...item, inStock: stockOverrides[p.id] };
        }
        return item;
      });
  }, [customProducts, firestoreCustomProducts, deployedCustomProducts, baseProducts, deletedIds, productOverrides, stockOverrides]);

  const adminProducts = useMemo(() => {
    const deletedSet = new Set(deletedIds);
    const combined = [...customProducts, ...firestoreCustomProducts, ...deployedCustomProducts, ...baseAdminProducts];
    const seen = new Set<string>();

    return combined
      .filter((p) => {
        if (seen.has(p.id) || deletedSet.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => {
        let item = p;
        if (productOverrides[p.id]) {
          item = { ...item, ...productOverrides[p.id] };
        }
        if (stockOverrides[p.id] !== undefined) {
          item = { ...item, inStock: stockOverrides[p.id] };
        }
        return item;
      });
  }, [customProducts, firestoreCustomProducts, deployedCustomProducts, baseAdminProducts, deletedIds, productOverrides, stockOverrides]);

  const validFittingCount = useMemo(() => {
    const productSet = new Set(products.map((p) => p.id));
    return fittingIds.filter((id) => productSet.has(id)).length;
  }, [products, fittingIds]);

  const validWishlistCount = useMemo(() => {
    const productSet = new Set(products.map((p) => p.id));
    return wishlistIds.filter((id) => productSet.has(id)).length;
  }, [products, wishlistIds]);

  // Clean stale/orphan IDs from localStorage when products change
  useEffect(() => {
    if (products.length === 0) return;
    const productSet = new Set(products.map((p) => p.id));

    setFittingIds((prev) => {
      const filtered = prev.filter((id) => productSet.has(id));
      if (filtered.length !== prev.length) {
        try {
          window.localStorage.setItem(LOCAL_FITTINGS_KEY, JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
      return prev;
    });

    setWishlistIds((prev) => {
      const filtered = prev.filter((id) => productSet.has(id));
      if (filtered.length !== prev.length) {
        try {
          window.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
      return prev;
    });
  }, [products]);

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

  const loginAdminWithPassword = useCallback(
    async (username: string, password: string, rememberMe = true) => {
      setAuthError(null);
      const res = await verifyAdminCredentials(username, password, rememberMe);
      if (res.success) {
        setIsAdmin(true);
        showToast('Вы успешно вошли в панель управления');
      } else if (res.error) {
        setAuthError(res.error);
      }
      return res;
    },
    [showToast]
  );

  const logoutAdmin = useCallback(() => {
    clearAdminSession();
    setIsAdmin(false);
    showToast('Вы вышли из панели администратора');
  }, [showToast]);

  const changeAdminPassword = useCallback(async (newPass: string) => {
    return changeAdminPassUtil(newPass);
  }, []);

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
        if (!exists) {
          recordProductInterest(product.id, 'fitting');
        }
        showToast(
          exists
            ? `Убрано из примерок: ${product.title}`
            : `Добавлено в «Хочу померить»: ${product.title}`
        );
        return next;
      });
    },
    [showToast, recordProductInterest]
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
        if (!exists) {
          recordProductInterest(product.id, 'wishlist');
        }
        showToast(
          exists
            ? `Убрано из избранного: ${product.title}`
            : `Добавлено в избранное: ${product.title}`
        );
        return next;
      });
    },
    [showToast, recordProductInterest]
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

      // Save local override so additions/edits immediately persist and display
      setProductOverrides((prev) => {
        const next = { ...prev, [productId]: basePayload };
        try {
          window.localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      const newProduct: Product = {
        id: productId,
        title: basePayload.title,
        description: basePayload.description,
        price: basePayload.price,
        currency: 'BYN',
        category: basePayload.category,
        sizes: basePayload.sizes,
        images: basePayload.images,
        era: basePayload.era,
        condition: basePayload.condition,
        measurements: basePayload.measurements,
        status: basePayload.status,
        inStock: basePayload.inStock,
        featured: basePayload.featured,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Global Real-time Firestore sync for ALL visitors
      try {
        const hash = getAdminHash();
        await setDoc(
          doc(db, 'metadata', 'catalog_state'),
          {
            adminHash: hash,
            productOverrides: {
              [productId]: {
                title: basePayload.title,
                description: basePayload.description,
                price: basePayload.price,
                currency: basePayload.currency,
                category: basePayload.category,
                sizes: basePayload.sizes,
                images: basePayload.images,
                era: basePayload.era,
                condition: basePayload.condition,
                measurements: basePayload.measurements,
                status: basePayload.status,
                inStock: basePayload.inStock,
                featured: basePayload.featured,
              },
            },
            ...(!existingId
              ? {
                  customProducts: {
                    [productId]: {
                      id: productId,
                      title: basePayload.title,
                      description: basePayload.description,
                      price: basePayload.price,
                      currency: 'BYN' as const,
                      category: basePayload.category,
                      sizes: basePayload.sizes,
                      images: basePayload.images,
                      era: basePayload.era,
                      condition: basePayload.condition,
                      measurements: basePayload.measurements,
                      status: basePayload.status,
                      inStock: basePayload.inStock,
                      featured: basePayload.featured,
                    },
                  },
                }
              : {}),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Firestore global product sync error:', error);
      }

      if (existingId) {
        setCustomProducts((prev) => {
          const exists = prev.some((p) => p.id === existingId);
          if (exists) {
            const next = prev.map((p) => (p.id === existingId ? { ...p, ...newProduct } : p));
            try {
              window.localStorage.setItem(LOCAL_CUSTOM_PRODUCTS_KEY, JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
      } else {
        setCustomProducts((prev) => {
          const next = [newProduct, ...prev.filter((p) => p.id !== productId)];
          try {
            window.localStorage.setItem(LOCAL_CUSTOM_PRODUCTS_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      // Sync to Git-backed serverless endpoint for cross-device global persistence
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProduct.title,
          price: newProduct.price,
          category: newProduct.category,
          sizes: newProduct.sizes,
          description: newProduct.description,
          measurements: newProduct.measurements,
          inStock: newProduct.inStock,
          status: newProduct.status,
          imageBase64: cleanImages[0],
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res?.persistedToGit) {
            showToast('Вещь зафиксирована в проекте для всех устройств!');
          }
        })
        .catch(() => {});

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
        console.warn('Firestore save offline fallback:', error);
        showToast('Товар сохранён локально');
        return productId;
      }
    },
    [adminFirestoreProducts, showToast]
  );

  const setProductStatus = useCallback(
    async (productId: string, status: ProductStatus) => {
      setProductOverrides((prev) => {
        const existing = prev[productId] || {};
        const next = { ...prev, [productId]: { ...existing, status } };
        try {
          window.localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      showToast(
        status === 'published' ? 'Товар опубликован на сайте' : 'Товар переведён в черновики'
      );

      try {
        await updateDoc(doc(db, 'products', productId), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('Firestore status sync offline fallback:', error);
      }
    },
    [showToast]
  );

  const setProductInStock = useCallback(
    async (productId: string, inStock: boolean) => {
      // 1. Instantly update local override and persist in localStorage
      setStockOverrides((prev) => {
        const next = { ...prev, [productId]: inStock };
        try {
          window.localStorage.setItem(LOCAL_STOCK_OVERRIDES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      showToast(
        inStock ? 'Товар отмечен: «В наличии»' : 'Товар отмечен: «ПРОДАНО»'
      );

      // 2. Global Real-time Firestore sync for ALL visitors & devices
      try {
        const hash = getAdminHash();
        await setDoc(
          doc(db, 'metadata', 'catalog_state'),
          {
            adminHash: hash,
            stockOverrides: {
              [productId]: inStock,
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Firestore SDK sync error, trying REST fallback:', error);
        try {
          const fsUrl = `https://firestore.googleapis.com/v1/projects/fundamental-inverter-l91ww/databases/ai-studio-remixremix-521d0fff-033e-415a-8e15-0c73d96d03e5/documents/metadata/catalog_state?key=AIzaSyBosVDYGZUauLmHZna4Jw9Yo7TjAeEznuw&updateMask.fieldPaths=stockOverrides.${productId}&updateMask.fieldPaths=adminHash`;
          await fetch(fsUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                adminHash: { stringValue: getAdminHash() },
                stockOverrides: { mapValue: { fields: { [productId]: { booleanValue: inStock } } } },
              },
            }),
          });
        } catch {}
      }
    },
    [showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      setCustomProducts((prev) => {
        const next = prev.filter((p) => p.id !== productId);
        try {
          window.localStorage.setItem(LOCAL_CUSTOM_PRODUCTS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      setDeletedIds((prev) => {
        const next = Array.from(new Set([...prev, productId]));
        try {
          window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast('Товар удалён из каталога');

      // Global Real-time Firestore sync for ALL visitors
      try {
        const hash = getAdminHash();
        await setDoc(
          doc(db, 'metadata', 'catalog_state'),
          {
            adminHash: hash,
            deletedIds: arrayUnion(productId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Firestore global delete sync error:', error);
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
    loginAdminWithPassword,
    logoutAdmin,
    changeAdminPassword,
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
    validFittingCount,
    fittingNotes,
    toggleFitting,
    setFittingNote,
    clearFittings,
    wishlistIds,
    validWishlistCount,
    toggleWishlist,
    clearWishlist,
    userOrders,
    adminOrders,
    newOrdersCount,
    placeOrder,
    updateOrderStatus,
    toastMessage,
    showToast,
    heroSettings,
    updateHeroSettings,
    resetHeroSettings,
    promoSettings,
    updatePromoSettings,
    resetPromoSettings,
    customProducts,
    interestStats,
    recordProductInterest,
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
