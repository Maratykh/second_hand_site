import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, ProductStatus } from '../types/store';
import { CATEGORY_LABELS } from '../types/store';
import { downloadProductPhoto } from '../utils/downloadImage';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import { AdminProductFormModal } from '../components/admin/AdminProductFormModal';
import { getLockoutStatus } from '../utils/adminAuth';

type AdminTab = 'inventory' | 'settings';
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

  // Password change states
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  // Lockout status
  const lockout = getLockoutStatus();

  // Statistics
  const inStockCount = useMemo(
    () => adminProducts.filter((p) => p.inStock).length,
    [adminProducts]
  );

  const soldCount = useMemo(
    () => adminProducts.filter((p) => !p.inStock).length,
    [adminProducts]
  );

  // Filtering + Searching
  const filteredProducts = useMemo(() => {
    let list = adminProducts;

    if (stockFilter === 'in_stock') {
      list = list.filter((p) => p.inStock);
    } else if (stockFilter === 'sold') {
      list = list.filter((p) => !p.inStock);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const fullText = `${p.title} ${p.description || ''} ${p.sizes.join(' ')} ${CATEGORY_LABELS[p.category] || ''} ${p.era || ''}`.toLowerCase();
        return words.every((w) => fullText.includes(w));
      });
    }

    return list;
  }, [adminProducts, stockFilter, searchQuery]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleToggleStock = async (product: Product) => {
    setUpdatingId(product.id);
    try {
      await setProductInStock(product.id, !product.inStock);
    } finally {
      setUpdatingId(null);
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

    try {
      await changeAdminPassword(newPassInput);
      setPassChangeSuccess(true);
      setNewPassInput('');
      setConfirmPassInput('');
      showToast('Пароль администратора успешно изменён');
    } catch (err) {
      setPassChangeError(err instanceof Error ? err.message : 'Ошибка при смене пароля');
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(adminProducts, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `lavka_zombie_catalog_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    showToast('Каталог экспортирован в JSON');
  };

  // If not logged in as admin, show secure login form
  if (!isAdmin) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto bg-[#111114] border border-zinc-800 p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white uppercase tracking-wider">
                Вход для сотрудников
              </h1>
              <p className="text-xs text-zinc-400">
                Панель учёта наличия «Лавка Зомби»
              </p>
            </div>
          </div>

          {lockout.isLocked && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-xs text-red-200 leading-relaxed">
              ⚠️ Слишком много неверных попыток. Вход заблокирован на{' '}
              {Math.ceil(lockout.remainingSeconds / 60)} мин. из соображений безопасности.
            </div>
          )}

          {loginError && !lockout.isLocked && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/60 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin или zombie"
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
              <ShieldCheck className="w-3.5 h-3.5" /> Режим сотрудника активен
            </span>
            <span className="text-xs text-zinc-500">База: {adminProducts.length} позиций</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-2">
            Учёт наличия товаров
          </h1>
        </div>

        {/* Tab switcher + Logout */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-1 bg-[#111114] border border-zinc-800" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Товары ({adminProducts.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#A3E635] text-[#09090B]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Настройки & Пароль
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
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'border-zinc-500 ring-1 ring-zinc-500'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">Всего позиций</span>
                <Package className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-white mt-2">
                {adminProducts.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'in_stock'
                  ? 'border-[#A3E635] ring-1 ring-[#A3E635]'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">В наличии</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]"></span>
              </div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#A3E635] mt-2">
                {inStockCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('sold')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'sold'
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">Продано</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-red-400 mt-2">
                {soldCount}
              </p>
            </button>
          </div>

          {/* Search Bar + Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111114] border border-zinc-800 p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск: Adidas, Vans, свитшот, куртка, S, M, ONE SIZE..."
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить товар</span>
              </button>
            </div>
          </div>

          {/* Items Counter */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>
              Показано позиций: <strong className="text-white">{filteredProducts.length}</strong>
              {searchQuery && ` по запросу «${searchQuery}»`}
            </span>
            <span className="text-zinc-500">
              💡 Нажмите на кнопку статуса для мгновенного переключения (В наличии / Продано)
            </span>
          </div>

          {/* Products Inventory Table */}
          <div className="bg-[#111114] border border-zinc-800 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#18181B] border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">Фото</th>
                  <th className="px-5 py-3.5">Название & Категория</th>
                  <th className="px-5 py-3.5">Размер</th>
                  <th className="px-5 py-3.5">Цена</th>
                  <th className="px-5 py-3.5">Наличие (1 клик)</th>
                  <th className="px-5 py-3.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 text-sm">
                      {searchQuery ? 'Ничего не найдено по данному запросу.' : 'Список товаров пуст.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.slice(0, 100).map((product) => {
                    const isUpdating = updatingId === product.id;
                    const displayTitle = (product.title || 'Винтажная позиция')
                      .replace(/<[^>]+>/g, '')
                      .slice(0, 80);

                    return (
                      <tr key={product.id} className="hover:bg-zinc-900/50 transition-colors">
                        {/* Column 1: Photo */}
                        <td className="px-5 py-3.5 w-16">
                          <div className="w-12 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                            {product.images[0] ? (
                              <SafeImage
                                src={product.images[0]}
                                alt={displayTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                                —
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 2: Title & Category */}
                        <td className="px-5 py-3.5 max-w-xs sm:max-w-md">
                          <p className="font-semibold text-white line-clamp-1">{displayTitle}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                            <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] uppercase font-mono">
                              {CATEGORY_LABELS[product.category] || product.category}
                            </span>
                            {product.era && (
                              <span className="text-zinc-500 text-[11px]">{product.era}</span>
                            )}
                          </div>
                        </td>

                        {/* Column 3: Sizes */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-xs font-mono font-medium text-zinc-200">
                            {product.sizes.join(', ') || 'ONE SIZE'}
                          </span>
                        </td>

                        {/* Column 4: Price */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-white">
                          {formatPriceBYN(product.price)}
                        </td>

                        {/* Column 5: 1-Click Stock Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleStock(product)}
                            title={product.inStock ? 'Нажмите, чтобы отметить ПРОДАНО' : 'Нажмите, чтобы вернуть В НАЛИЧИЕ'}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                              product.inStock
                                ? 'bg-[#A3E635]/15 text-[#A3E635] border-[#A3E635]/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50'
                                : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-[#A3E635]/20 hover:text-[#A3E635] hover:border-[#A3E635]/50'
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : product.inStock ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-[#A3E635]"></span>
                                <span>В НАЛИЧИИ</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span>ПРОДАНО</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Column 6: Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`#/product/${product.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Открыть карточку товара на сайте"
                              className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {product.images[0] && (
                              <button
                                type="button"
                                title="Скачать оригинальное фото"
                                onClick={async () => {
                                  await downloadProductPhoto(product.images[0], displayTitle, 0);
                                  showToast('Скачивание фото начато');
                                }}
                                className="p-2 text-zinc-400 hover:text-[#A3E635] cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              title="Редактировать товар"
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title="Удалить товар"
                              onClick={() => deleteProduct(product.id)}
                              className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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

      {/* TAB 2: SETTINGS & BACKUP */}
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
