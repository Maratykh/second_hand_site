import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  BarChart2,
  Check,
  CheckCircle2,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Image as ImageIcon,
  Info,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, ProductCategory, ProductStatus } from '../types/store';
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from '../types/store';
import { downloadProductPhoto } from '../utils/downloadImage';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import { AdminProductFormModal } from '../components/admin/AdminProductFormModal';
import { getLockoutStatus } from '../utils/adminAuth';

type AdminTab = 'inventory' | 'analytics' | 'hero' | 'settings';
type StockFilter = 'all' | 'in_stock' | 'sold';

export const AdminPage: React.FC = () => {
  const {
    isAdmin,
    loginAdminWithPassword,
    logoutAdmin,
    changeAdminPassword,
    adminProducts,
    setProductInStock,
    deleteProduct,
    showToast,
    heroSettings,
    updateHeroSettings,
    resetHeroSettings,
    promoSettings,
    updatePromoSettings,
    resetPromoSettings,
    interestStats,
  } = useStore();

  // Login form states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tab & inventory states
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Hero settings form states
  const [heroBadgeInput, setHeroBadgeInput] = useState(heroSettings?.badge || '');
  const [heroTitleInput, setHeroTitleInput] = useState(heroSettings?.title || '');
  const [heroDescInput, setHeroDescInput] = useState(heroSettings?.description || '');
  const [heroBannerInput, setHeroBannerInput] = useState(heroSettings?.bannerImage || '');
  const [heroUploadLoading, setHeroUploadLoading] = useState(false);

  // Promo announcement form states
  const [promoEnabledInput, setPromoEnabledInput] = useState(promoSettings?.enabled ?? true);
  const [promoBadgeInput, setPromoBadgeInput] = useState(promoSettings?.badge || '🔥 СВЕЖИЙ ДРОП');
  const [promoTextInput, setPromoTextInput] = useState(promoSettings?.text || '');
  const [promoLinkTextInput, setPromoLinkTextInput] = useState(promoSettings?.linkText || 'Смотреть каталог →');

  useEffect(() => {
    if (heroSettings) {
      setHeroBadgeInput(heroSettings.badge);
      setHeroTitleInput(heroSettings.title);
      setHeroDescInput(heroSettings.description);
      setHeroBannerInput(heroSettings.bannerImage);
    }
  }, [heroSettings]);

  useEffect(() => {
    if (promoSettings) {
      setPromoEnabledInput(promoSettings.enabled);
      setPromoBadgeInput(promoSettings.badge || '🔥 СВЕЖИЙ ДРОП');
      setPromoTextInput(promoSettings.text);
      setPromoLinkTextInput(promoSettings.linkText || 'Смотреть каталог →');
    }
  }, [promoSettings]);

  // Password change states
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  // Lockout status
  const lockout = getLockoutStatus();

  // 1. Stock Statistics
  const inStockItems = useMemo(
    () => adminProducts.filter((p) => p.inStock),
    [adminProducts]
  );

  const soldItems = useMemo(
    () => adminProducts.filter((p) => !p.inStock),
    [adminProducts]
  );

  const totalValueByn = useMemo(
    () => inStockItems.reduce((acc, p) => acc + (Number(p.price) || 0), 0),
    [inStockItems]
  );

  const totalValueRub = useMemo(
    () => Math.round(totalValueByn * 30),
    [totalValueByn]
  );

  const soldValueByn = useMemo(
    () => soldItems.reduce((acc, p) => acc + (Number(p.price) || 0), 0),
    [soldItems]
  );

  const avgPriceByn = useMemo(
    () => (inStockItems.length > 0 ? Math.round(totalValueByn / inStockItems.length) : 0),
    [inStockItems, totalValueByn]
  );

  // 2. Category Stats
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; inStock: number; value: number }> = {};
    PRODUCT_CATEGORIES.forEach((cat) => {
      map[cat.key] = { total: 0, inStock: 0, value: 0 };
    });
    adminProducts.forEach((p) => {
      const key = p.category || 'other';
      if (!map[key]) map[key] = { total: 0, inStock: 0, value: 0 };
      map[key].total++;
      if (p.inStock) {
        map[key].inStock++;
        map[key].value += Number(p.price) || 0;
      }
    });
    return map;
  }, [adminProducts]);

  // 3. Customer Interest Ranking (fittings & wishlist)
  const topInterestProducts = useMemo(() => {
    return adminProducts
      .map((p) => {
        const stats = interestStats[p.id] || { fittings: 0, wishlist: 0 };
        const score = stats.fittings * 2 + stats.wishlist;
        return {
          product: p,
          fittings: stats.fittings,
          wishlist: stats.wishlist,
          score,
        };
      })
      .filter((item) => item.score > 0 || item.product.featured)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [adminProducts, interestStats]);

  // Filtering + Searching for inventory tab
  const filteredProducts = useMemo(() => {
    let list = adminProducts;

    if (stockFilter === 'in_stock') {
      list = list.filter((p) => p.inStock);
    } else if (stockFilter === 'sold') {
      list = list.filter((p) => !p.inStock);
    }

    if (searchQuery.trim()) {
      const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const titleMatch = (p.title || '').toLowerCase();
        const descMatch = (p.description || '').toLowerCase();
        const categoryMatch = (CATEGORY_LABELS[p.category] || '').toLowerCase();
        const sizeMatch = (p.sizes || []).join(' ').toLowerCase();
        const combined = `${titleMatch} ${descMatch} ${categoryMatch} ${sizeMatch}`;

        return tokens.every((token) => combined.includes(token));
      });
    }

    return list;
  }, [adminProducts, stockFilter, searchQuery]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await loginAdminWithPassword(usernameInput, passwordInput, rememberMe);
      if (!res.success) {
        setLoginError(res.error || 'Неверный логин или пароль');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStockToggle = async (productId: string, currentInStock: boolean) => {
    setUpdatingId(productId);
    try {
      await setProductInStock(productId, !currentInStock);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (productId: string, title: string) => {
    if (confirm(`Удалить вещь «${title}» из каталога?`)) {
      await deleteProduct(productId);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError(null);
    setPassChangeSuccess(false);

    if (newPassInput.length < 6) {
      setPassChangeError('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeError('Пароли не совпадают');
      return;
    }

    const success = await changeAdminPassword(newPassInput);
    if (success) {
      setPassChangeSuccess(true);
      setNewPassInput('');
      setConfirmPassInput('');
      showToast('Пароль успешно обновлён!');
    } else {
      setPassChangeError('Ошибка при сохранении пароля');
    }
  };

  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroSettings({
      badge: heroBadgeInput.trim(),
      title: heroTitleInput.trim(),
      description: heroDescInput.trim(),
      bannerImage: heroBannerInput.trim(),
    });
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    updatePromoSettings({
      enabled: promoEnabledInput,
      badge: promoBadgeInput.trim(),
      text: promoTextInput.trim(),
      linkText: promoLinkTextInput.trim(),
    });
  };

  const handleApplyPromoPreset = (badge: string, text: string, link: string) => {
    setPromoEnabledInput(true);
    setPromoBadgeInput(badge);
    setPromoTextInput(text);
    setPromoLinkTextInput(link);
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawData = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setHeroBannerInput(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          setHeroBannerInput(rawData);
        }
        setHeroUploadLoading(false);
      };
      img.onerror = () => {
        setHeroBannerInput(rawData);
        setHeroUploadLoading(false);
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSetProductAsHero = (imageUrl: string) => {
    setHeroBannerInput(imageUrl);
    updateHeroSettings({ bannerImage: imageUrl });
    showToast('Фото вещи установлено на главную афишу!');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(adminProducts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lavka_zombie_catalog_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('База данных скачана в JSON');
  };

  // Login Screen if not authenticated
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="bg-[#111114] border border-zinc-800 p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center mx-auto text-[#A3E635]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight">
              Вход для сотрудников
            </h1>
            <p className="text-xs text-zinc-400">
              Управление наличием, афишей, винтажным складом и аналитикой
            </p>
          </div>

          {lockout.isLocked && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-xs text-red-300 leading-relaxed">
              ⛔ Слишком много неверных попыток. Вход временно заблокирован на{' '}
              <strong>{Math.ceil(lockout.remainingSeconds / 60)} мин.</strong>
            </div>
          )}

          {loginError && !lockout.isLocked && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Логин"
                  disabled={lockout.isLocked || loginLoading}
                  className="w-full bg-[#18181B] border border-zinc-700/80 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={lockout.isLocked || loginLoading}
                  className="w-full bg-[#18181B] border border-zinc-700/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#A3E635]"
                />
                <span>Запомнить на этом устройстве</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={lockout.isLocked || loginLoading}
              className="w-full mt-2 py-3 bg-[#A3E635] text-[#09090B] font-bold text-sm uppercase tracking-wider hover:bg-lime-300 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? (
                <span>Проверка...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Войти в панель</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A3E635] shrink-0" />
            <span>Защищено криптографическим хэшем SHA-256 и блокировкой при переборе паролей.</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Панель управления
            </span>
            <span className="text-xs text-zinc-500">База: {adminProducts.length} позиций</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-2">
            {activeTab === 'inventory' && 'Инвентарь и склад'}
            {activeTab === 'analytics' && 'Аналитика и спрос'}
            {activeTab === 'hero' && 'Афиша, Главная & Промо-строка'}
            {activeTab === 'settings' && 'Безопасность и бэкап'}
          </h1>
        </div>

        {/* Tab switcher + Logout */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 p-1 bg-[#111114] border border-zinc-800" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Товары ({adminProducts.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Аналитика</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'hero'}
              onClick={() => setActiveTab('hero')}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hero'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Афиша & Акции</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Пароль & Бэкап</span>
            </button>
          </div>

          <button
            type="button"
            onClick={logoutAdmin}
            title="Выйти из режима администратора"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-red-400 bg-[#111114] border border-zinc-800 hover:border-red-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY & STOCK MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`p-3 sm:p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'border-zinc-500 ring-1 ring-zinc-500'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-zinc-400 uppercase font-medium">Всего</span>
                <Package className="w-4 h-4 text-zinc-400 hidden xs:block" />
              </div>
              <p className="font-mono tabular-nums text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">
                {adminProducts.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`p-3 sm:p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'in_stock'
                  ? 'border-[#A3E635] ring-1 ring-[#A3E635]'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-zinc-400 uppercase font-medium">В наличии</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]"></span>
              </div>
              <p className="font-mono tabular-nums text-xl sm:text-3xl font-bold text-[#A3E635] mt-1 sm:mt-2">
                {inStockItems.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('sold')}
              className={`p-3 sm:p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'sold'
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-zinc-400 uppercase font-medium">Продано</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <p className="font-mono tabular-nums text-xl sm:text-3xl font-bold text-red-400 mt-1 sm:mt-2">
                {soldItems.length}
              </p>
            </button>
          </div>

          {/* Search Bar + Fast Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111114] border border-zinc-800 p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск: Carhartt, Adidas, худи, куртка, S, M, XL..."
                className="w-full bg-[#18181B] border border-zinc-700/60 pl-9 pr-8 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer shrink-0 shadow-lg shadow-lime-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Быстро добавить вещь</span>
              </button>
            </div>
          </div>

          {/* Items Counter */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>
              Показано позиций: <strong className="text-white">{filteredProducts.length}</strong>
              {searchQuery && ` по запросу «${searchQuery}»`}
            </span>
            <span className="text-zinc-500 hidden sm:inline">
              💡 Нажмите на переключатель статуса для мгновенной смены (В наличии / Продано)
            </span>
          </div>

          {/* Products Inventory Table */}
          <div className="bg-[#111114] border border-zinc-800 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#18181B] border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3 px-4 w-16">Фото</th>
                  <th className="py-3 px-4">Название и Категория</th>
                  <th className="py-3 px-4 w-28">Цена</th>
                  <th className="py-3 px-4 w-24">Размер</th>
                  <th className="py-3 px-4 w-44">Статус на сайте</th>
                  <th className="py-3 px-4 w-36 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredProducts.slice(0, 100).map((product) => {
                  const isUpdating = updatingId === product.id;
                  const priceByn = product.price || 0;
                  const priceRub = (product as { priceRub?: number }).priceRub || Math.round(priceByn * 30);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-[#18181B]/60 transition-colors ${
                        !product.inStock ? 'opacity-60 bg-[#0d0d0f]' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="w-12 h-14 bg-[#141417] border border-zinc-800 overflow-hidden shrink-0">
                          <SafeImage
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-white line-clamp-1">{product.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                          <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] uppercase font-mono text-zinc-300">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </span>
                          {product.measurements?.width && (
                            <span className="text-zinc-500 text-[11px]">
                              Грудь: {product.measurements.width}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-mono font-bold text-white text-sm">
                          {formatPriceBYN(priceByn)}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500">{priceRub} RUB</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-zinc-200 bg-zinc-800/80 px-2 py-0.5 border border-zinc-700/60">
                          {(product.sizes || []).join(', ') || 'OS'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStockToggle(product.id, product.inStock)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                            product.inStock
                              ? 'bg-lime-950/40 text-[#A3E635] border-lime-800/60 hover:bg-lime-900/60'
                              : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.inStock ? 'bg-[#A3E635]' : 'bg-red-400'
                            }`}
                          ></span>
                          <span>{product.inStock ? 'В наличии' : 'Продано'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductModal(true);
                            }}
                            title="Редактировать вещь"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadProductPhoto(product.images[0], product.title, 0)
                            }
                            title="Скачать фото"
                            className="p-1.5 text-zinc-400 hover:text-[#A3E635] hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id, product.title)}
                            title="Удалить из каталога"
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > 100 && (
            <p className="text-center text-xs text-zinc-500 py-2">
              Отображаются первые 100 позиций. Воспользуйтесь строкой поиска выше, чтобы мгновенно найти любую конкретную вещь.
            </p>
          )}
        </div>
      )}

      {/* TAB 2: WAREHOUSE & DEMAND ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Main 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111114] border border-zinc-800 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-medium">
                <span>Стоимость на складе</span>
                <span className="p-1.5 bg-[#A3E635]/10 text-[#A3E635] rounded">BYN</span>
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {totalValueByn.toLocaleString('ru-RU')} BYN
              </p>
              <p className="text-xs text-zinc-500">
                ≈ {totalValueRub.toLocaleString('ru-RU')} RUB в наличии
              </p>
            </div>

            <div className="bg-[#111114] border border-zinc-800 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-medium">
                <span>Товаров в наличии</span>
                <Package className="w-4 h-4 text-[#A3E635]" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-[#A3E635] tracking-tight">
                {inStockItems.length} шт.
              </p>
              <p className="text-xs text-zinc-500">
                {Math.round((inStockItems.length / (adminProducts.length || 1)) * 100)}% от всей базы ({adminProducts.length})
              </p>
            </div>

            <div className="bg-[#111114] border border-zinc-800 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-medium">
                <span>Продано вещей</span>
                <CheckCircle2 className="w-4 h-4 text-red-400" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-red-400 tracking-tight">
                {soldItems.length} шт.
              </p>
              <p className="text-xs text-zinc-500">
                Сумма реализованного: {soldValueByn.toLocaleString('ru-RU')} BYN
              </p>
            </div>

            <div className="bg-[#111114] border border-zinc-800 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-medium">
                <span>Средний чек винтажа</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-sky-400 tracking-tight">
                {avgPriceByn} BYN
              </p>
              <p className="text-xs text-zinc-500">
                ≈ {Math.round(avgPriceByn * 30)} RUB за единицу
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Category Breakdown */}
            <div className="lg:col-span-5 bg-[#111114] border border-zinc-800 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#A3E635]" />
                  <h2 className="font-display text-lg font-bold text-white uppercase">
                    Склад по категориям
                  </h2>
                </div>
                <span className="text-xs text-zinc-500">{PRODUCT_CATEGORIES.length} кат.</span>
              </div>

              <div className="space-y-4">
                {PRODUCT_CATEGORIES.map((cat) => {
                  const stat = categoryStats[cat.key] || { total: 0, inStock: 0, value: 0 };
                  const pct = inStockItems.length > 0 ? Math.round((stat.inStock / inStockItems.length) * 100) : 0;

                  return (
                    <div key={cat.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">{cat.label}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[#A3E635] font-semibold">{stat.inStock} в наличии</span>
                          <span className="text-zinc-500">/ {stat.total}</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-[#A3E635] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                        <span>{pct}% склада</span>
                        <span>{stat.value.toLocaleString('ru-RU')} BYN</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Demand / Interest Ranking */}
            <div className="lg:col-span-7 bg-[#111114] border border-zinc-800 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h2 className="font-display text-lg font-bold text-white uppercase">
                    Счётчик интереса покупателей
                  </h2>
                </div>
                <span className="text-xs text-zinc-400">Топ примерок и избранного</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Позиции, которые посетители сайта чаще всего добавляют в список <strong>«Хочу померить»</strong> перед походом в шоурум на ул. Веры Хоружей 3 и в <strong>«Избранное»</strong>:
              </p>

              <div className="divide-y divide-zinc-800/80">
                {topInterestProducts.map((item, idx) => (
                  <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-zinc-500 w-5 shrink-0">
                        0{idx + 1}.
                      </span>
                      <div className="w-10 h-12 bg-[#141417] border border-zinc-800 overflow-hidden shrink-0">
                        <SafeImage
                          src={item.product.images[0]}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-xs truncate max-w-[200px] sm:max-w-[260px]">
                          {item.product.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {item.product.price} BYN · {CATEGORY_LABELS[item.product.category]}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 border border-zinc-700/60 text-xs">
                        <span className="text-[#A3E635] font-mono font-bold">
                          {item.fittings}
                        </span>
                        <span className="text-zinc-400 text-[10px]">примерок</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 border border-zinc-700/60 text-xs">
                        <Heart className="w-3 h-3 text-pink-400 fill-pink-400/40" />
                        <span className="text-zinc-200 font-mono font-bold">{item.wishlist}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSetProductAsHero(item.product.images[0])}
                        title="Поставить на главную афишу"
                        className="px-2 py-1 bg-zinc-800 hover:bg-[#A3E635] hover:text-[#09090B] text-[11px] font-medium text-zinc-300 transition-colors cursor-pointer hidden sm:inline-flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>На афишу</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HERO & BANNER CUSTOMIZATION */}
      {activeTab === 'hero' && (
        <div className="space-y-8">
          <div className="bg-[#111114] border border-zinc-800 p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-white uppercase">
                Афиша и главный экран сайта
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Здесь можно легко заменить фотографию на главной афише, поменять заголовок и описание свежего дропа.
              </p>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-700/70 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Синхронизация между устройствами:</span>
                <p className="mt-0.5 text-zinc-400">
                  Установленное фото афиши зафиксировано в файлах сайта (<code className="text-zinc-200 font-mono">/assets/images/hero_banner.jpg</code>) и отображается на всех телефонах, компьютерах и у посетителей.
                </p>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="border border-zinc-700 p-5 bg-[#09090B] space-y-4">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#A3E635] font-bold">
                Предпросмотр на главной странице:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                    {heroBadgeInput || 'Минск · ул. Веры Хоружей 3, оф. 308'}
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase leading-tight">
                    {heroTitleInput || 'Селективный винтаж без лишней наценки'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {heroDescInput || 'Архивная кожа, тяжёлый хлопок 90-х и честный деним — в одном экземпляре.'}
                  </p>
                </div>

                <div className="md:col-span-6 relative aspect-[4/3] bg-[#141417] border border-zinc-800 overflow-hidden">
                  <SafeImage
                    src={heroBannerInput}
                    alt="Афиша"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 text-[11px] text-white font-mono">
                    Афиша шоурума
                  </div>
                </div>
              </div>
            </div>

            {/* Customization Form */}
            <form onSubmit={handleSaveHero} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs uppercase font-semibold text-zinc-300">
                  Главная фотография афиши (URL или загрузка файла)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={heroBannerInput}
                    onChange={(e) => setHeroBannerInput(e.target.value)}
                    placeholder="Вставьте прямую ссылку на фото (VK, Imgur, Telegram...)"
                    className="flex-1 bg-[#18181B] border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />

                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#18181B] border border-zinc-700 hover:border-[#A3E635] text-xs font-semibold text-white uppercase tracking-wider transition-colors cursor-pointer shrink-0">
                    <Upload className="w-4 h-4 text-[#A3E635]" />
                    <span>{heroUploadLoading ? 'Обработка...' : 'Загрузить файл'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-zinc-300">
                    Бейдж локации / часов
                  </label>
                  <input
                    type="text"
                    value={heroBadgeInput}
                    onChange={(e) => setHeroBadgeInput(e.target.value)}
                    placeholder="Минск · ул. Веры Хоружей 3, оф. 308"
                    className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-zinc-300">
                    Главный слоган / заголовок
                  </label>
                  <input
                    type="text"
                    value={heroTitleInput}
                    onChange={(e) => setHeroTitleInput(e.target.value)}
                    placeholder="Селективный винтаж без лишней наценки"
                    className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-semibold text-zinc-300">
                  Текст описания дропа
                </label>
                <textarea
                  rows={2}
                  value={heroDescInput}
                  onChange={(e) => setHeroDescInput(e.target.value)}
                  placeholder="Селективный магазин винтажной одежды по доступным ценам..."
                  className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#A3E635] text-[#09090B] font-bold text-xs uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  Сохранить настройки афиши
                </button>

                <button
                  type="button"
                  onClick={resetHeroSettings}
                  className="px-4 py-3 bg-[#18181B] border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Сбросить по умолчанию
                </button>
              </div>
            </form>
          </div>

          {/* PROMO BANNER / ANNOUNCEMENT TICKER CONTROL */}
          <div className="bg-[#111114] border border-zinc-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h2 className="font-display text-xl font-bold text-white uppercase">
                    Промо-строка акций и дропов
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Управляйте неоновой строкой объявлений в самой верхней шапке сайта для всех посетителей.
                </p>
              </div>

              {/* Status Pill & Switch */}
              <label className="inline-flex items-center gap-3 cursor-pointer select-none self-start sm:self-auto bg-[#18181B] px-3.5 py-2 border border-zinc-700">
                <input
                  type="checkbox"
                  checked={promoEnabledInput}
                  onChange={(e) => setPromoEnabledInput(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                    promoEnabledInput ? 'bg-[#A3E635]' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#09090B] transition-transform ${
                      promoEnabledInput ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    promoEnabledInput ? 'text-[#A3E635]' : 'text-zinc-400'
                  }`}
                >
                  {promoEnabledInput ? 'Включена на сайте' : 'Выключена'}
                </span>
              </label>
            </div>

            {/* Live Preview Box */}
            <div className="border border-zinc-700 p-4 bg-[#09090B] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#A3E635] font-bold">
                  Живой предпросмотр в шапке сайта:
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {promoEnabledInput ? 'Активно' : 'Скрыто'}
                </span>
              </div>

              {promoEnabledInput ? (
                <div className="bg-[#A3E635] text-[#09090B] px-4 py-2 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm border border-lime-400">
                  {promoBadgeInput && (
                    <span className="bg-[#09090B] text-[#A3E635] text-[10px] font-mono uppercase px-2 py-0.5 font-bold tracking-wider shrink-0">
                      {promoBadgeInput}
                    </span>
                  )}
                  <span className="truncate max-w-[70vw] sm:max-w-none">
                    {promoTextInput || 'Текст анонса или скидки появится здесь...'}
                  </span>
                  {promoLinkTextInput && (
                    <span className="hidden sm:inline-flex underline underline-offset-2 font-bold ml-1 cursor-pointer shrink-0">
                      {promoLinkTextInput}
                    </span>
                  )}
                </div>
              ) : (
                <div className="py-2.5 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 bg-[#141417]/40">
                  Промо-строка выключена (в шапке сайта будет чисто)
                </div>
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <span className="text-xs uppercase font-semibold text-zinc-400">
                Быстрые шаблоны в 1 клик:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPromoPreset(
                      '🔥 СВЕЖИЙ ДРОП',
                      'Большое обновление курток, худи и свитшотов! Приходите на примерку на Хоружей 3',
                      'Смотреть каталог →'
                    )
                  }
                  className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer"
                >
                  🔥 Свежий дроп
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPromoPreset(
                      '⚡ СКИДКА 20%',
                      'Скидка -20% на весь деним и брюки до конца недели! Количество вещей ограничено',
                      'В каталог скидок →'
                    )
                  }
                  className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer"
                >
                  ⚡ Скидка на категорию
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPromoPreset(
                      '📢 ШОУРУМ В МИНСКЕ',
                      'Работаем ежедневно с 11:00 на ул. Веры Хоружей 3, оф. 308. Заходите на кофе и примерку!',
                      'Контакты и адрес →'
                    )
                  }
                  className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer"
                >
                  📢 Шоурум и график
                </button>
              </div>
            </div>

            {/* Promo Form */}
            <form onSubmit={handleSavePromo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-zinc-300">
                    Бейдж акции (слева)
                  </label>
                  <input
                    type="text"
                    value={promoBadgeInput}
                    onChange={(e) => setPromoBadgeInput(e.target.value)}
                    placeholder="🔥 СВЕЖИЙ ДРОП"
                    className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>

                <div className="sm:col-span-8 space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-zinc-300">
                    Текст ссылки / кнопки
                  </label>
                  <input
                    type="text"
                    value={promoLinkTextInput}
                    onChange={(e) => setPromoLinkTextInput(e.target.value)}
                    placeholder="Смотреть каталог →"
                    className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-semibold text-zinc-300">
                  Текст объявления акции
                </label>
                <textarea
                  rows={2}
                  value={promoTextInput}
                  onChange={(e) => setPromoTextInput(e.target.value)}
                  placeholder="Введите текст акции или новость..."
                  className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#A3E635] text-[#09090B] font-bold text-xs uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  Сохранить промо-строку
                </button>

                <button
                  type="button"
                  onClick={resetPromoSettings}
                  className="px-4 py-3 bg-[#18181B] border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Сбросить промо-строку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & BACKUP */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <div className="bg-[#111114] border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-[#A3E635]" />
              <h2 className="font-display text-xl font-bold text-white uppercase">
                Смена пароля сотрудника
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Вы можете задать новый пароль для доступа к панели. Он сразу сохранится в защищённом виде (хэш SHA-256 с солью).
            </p>

            {passChangeSuccess && (
              <div className="p-3 bg-lime-950/40 border border-lime-800/60 text-xs text-[#A3E635]">
                ✓ Пароль успешно обновлён!
              </div>
            )}

            {passChangeError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                {passChangeError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">
                  Новый пароль
                </label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1">
                  Повторите новый пароль
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full bg-[#18181B] border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#A3E635]"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#A3E635] text-[#09090B] font-bold text-xs uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer"
              >
                Сохранить новый пароль
              </button>
            </form>
          </div>

          {/* Database Backup Card */}
          <div className="bg-[#111114] border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#A3E635]" />
              <h2 className="font-display text-xl font-bold text-white uppercase">
                База данных и Резервная копия
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              В каталоге загружено <strong className="text-white">{adminProducts.length} позиций</strong> из архива ВК. Вы можете экспортировать их в файл или сбросить статусы.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#18181B] border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#A3E635]" />
                <span>Скачать резервную копию (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Сбросить все отметки «Продано» и вернуть все товары в наличие?')) {
                    localStorage.removeItem('zombie_stock_overrides_v1');
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#18181B] border border-zinc-800 hover:border-red-900/60 text-xs font-semibold text-zinc-400 hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Сбросить все отметки проданного</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Product Modal */}
      {showProductModal && (
        <AdminProductFormModal
          initialProduct={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};
