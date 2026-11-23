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
  LogIn,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, ProductStatus } from '../types/store';
import {
  ADMIN_EMAIL,
  CATEGORY_LABELS,
  PRODUCT_STATUS_LABELS,
} from '../types/store';
import { downloadProductPhoto } from '../utils/downloadImage';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import { AdminProductFormModal } from '../components/admin/AdminProductFormModal';
import { AdminVkSyncTab } from '../components/admin/AdminVkSyncTab';

type AdminTab = 'inventory' | 'vk';
type StockFilter = 'all' | 'in_stock' | 'sold' | 'draft';

export const AdminPage: React.FC = () => {
  const {
    user,
    authReady,
    isAdmin,
    signInWithGoogle,
    adminProducts,
    usingFallbackSeed,
    seedInitialProductsToDb,
    setProductStatus,
    setProductInStock,
    deleteProduct,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Statistics
  const inStockCount = useMemo(
    () => adminProducts.filter((p) => p.status !== 'draft' && p.inStock).length,
    [adminProducts]
  );

  const soldCount = useMemo(
    () => adminProducts.filter((p) => p.status !== 'draft' && !p.inStock).length,
    [adminProducts]
  );

  const draftsCount = useMemo(
    () => adminProducts.filter((p) => p.status === 'draft').length,
    [adminProducts]
  );

  // Filtering + Searching for employees
  const filteredProducts = useMemo(() => {
    let list = adminProducts;

    // Filter by stock / draft
    if (stockFilter === 'in_stock') {
      list = list.filter((p) => p.status !== 'draft' && p.inStock);
    } else if (stockFilter === 'sold') {
      list = list.filter((p) => p.status !== 'draft' && !p.inStock);
    } else if (stockFilter === 'draft') {
      list = list.filter((p) => p.status === 'draft');
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const sizeMatch = p.sizes.some((s) => s.toLowerCase().includes(q));
        const catMatch = (CATEGORY_LABELS[p.category] || '').toLowerCase().includes(q);
        const eraMatch = (p.era || '').toLowerCase().includes(q);
        return titleMatch || descMatch || sizeMatch || catMatch || eraMatch;
      });
    }

    return list;
  }, [adminProducts, stockFilter, searchQuery]);

  if (!authReady) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm text-zinc-400">
        Проверка прав доступа...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-lg mx-auto bg-[#111114] border border-zinc-800 p-8 sm:p-10 space-y-5">
          <ShieldAlert className="w-8 h-8 text-[#A3E635]" aria-hidden="true" />
          <h1 className="font-display text-3xl font-bold text-white uppercase">
            Панель администратора
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {user
              ? `Аккаунт ${user.email} не входит в список администраторов магазина. Войдите под аккаунтом владельца (${ADMIN_EMAIL}).`
              : `Для учёта наличия товаров, отметки проданного и импорта из ВК войдите через Google-аккаунт администратора (${ADMIN_EMAIL}).`}
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Войти через Google (Админ)</span>
          </button>
        </div>
      </div>
    );
  }

  const handleToggleStock = async (product: Product) => {
    setUpdatingId(product.id);
    try {
      await setProductInStock(product.id, !product.inStock);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      await seedInitialProductsToDb();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">
            Лавка Зомби · Учёт наличия и товаров · {user.email}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-1">
            Панель сотрудника / Админка
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#111114] border border-zinc-800" role="tablist">
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
            Учёт наличия ({adminProducts.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vk'}
            onClick={() => setActiveTab('vk')}
            className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'vk'
                ? 'bg-[#A3E635] text-[#09090B]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Импорт из ВК {draftsCount > 0 ? `(${draftsCount} черн.)` : ''}
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY & STOCK MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'in_stock' ? 'border-[#A3E635] ring-1 ring-[#A3E635]' : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">В наличии</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635]"></span>
              </div>
              <p className="font-mono tabular-nums text-3xl font-bold text-[#A3E635] mt-2">
                {inStockCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('sold')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'sold' ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">Продано</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <p className="font-mono tabular-nums text-3xl font-bold text-red-400 mt-2">
                {soldCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('draft')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'draft' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">Черновики</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              </div>
              <p className="font-mono tabular-nums text-3xl font-bold text-amber-400 mt-2">
                {draftsCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`p-4 bg-[#111114] border text-left transition-colors cursor-pointer ${
                stockFilter === 'all' ? 'border-zinc-400 ring-1 ring-zinc-400' : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase font-medium">Всего товаров</span>
                <Package className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="font-mono tabular-nums text-3xl font-bold text-white mt-2">
                {adminProducts.length}
              </p>
            </button>
          </div>

          {/* Search Bar + Controls for Employees */}
          <div className="bg-[#111114] border border-zinc-800 p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Live search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Быстрый поиск для сотрудников: название, бренд, размер (M, L), категория..."
                  className="w-full pl-10 pr-9 py-2.5 bg-[#09090B] border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#A3E635]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {usingFallbackSeed && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedDatabase}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{seeding ? 'Сохраняем...' : 'Загрузить в Firestore'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Добавить товар</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
              <span className="text-xs text-zinc-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Фильтр:
              </span>
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  stockFilter === 'all'
                    ? 'bg-zinc-100 text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white'
                }`}
              >
                Все ({adminProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  stockFilter === 'in_stock'
                    ? 'bg-[#A3E635] text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-[#A3E635]'
                }`}
              >
                🟢 В наличии ({inStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('sold')}
                className={`px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  stockFilter === 'sold'
                    ? 'bg-red-500 text-white font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-red-400'
                }`}
              >
                🔴 Продано ({soldCount})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('draft')}
                className={`px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  stockFilter === 'draft'
                    ? 'bg-amber-400 text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-amber-400'
                }`}
              >
                📝 Черновики ({draftsCount})
              </button>
            </div>
          </div>

          {/* Products List / Table with 1-Click Stock Toggle */}
          <div className="bg-[#111114] border border-zinc-800/80 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Товар</th>
                  <th className="px-5 py-3.5 font-medium">Размер</th>
                  <th className="px-5 py-3.5 font-medium">Цена</th>
                  <th className="px-5 py-3.5 font-medium">Наличие</th>
                  <th className="px-5 py-3.5 font-medium text-center">1-Клик для сотрудников</th>
                  <th className="px-5 py-3.5 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs text-zinc-500 space-y-2">
                      <p className="text-zinc-400 font-medium">Позиции не найдены</p>
                      {searchQuery && (
                        <p>
                          По запросу «{searchQuery}» ничего не найдено.{' '}
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-[#A3E635] underline"
                          >
                            Сбросить поиск
                          </button>
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isDraft = product.status === 'draft';
                    const displayTitle = product.title.trim() || 'Черновик (без названия)';
                    const isUpdating = updatingId === product.id;

                    return (
                      <tr key={product.id} className="hover:bg-[#16161A] transition-colors">
                        {/* Column 1: Image & Title */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3.5">
                            <a
                              href={`#/product/${product.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-12 h-16 bg-[#141417] border border-zinc-800 shrink-0 overflow-hidden group block"
                            >
                              <SafeImage
                                src={product.images[0]}
                                alt={displayTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                            <div className="min-w-0">
                              <a
                                href={`#/product/${product.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-zinc-100 hover:text-[#A3E635] truncate max-w-[280px] block transition-colors"
                              >
                                {displayTitle}
                              </a>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {CATEGORY_LABELS[product.category]}
                                {product.era ? ` · ${product.era}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Size */}
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-300 font-bold">
                          {product.sizes.join(', ')}
                        </td>

                        {/* Column 3: Price */}
                        <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-[#A3E635] whitespace-nowrap">
                          {product.price > 0 ? formatPriceBYN(product.price) : 'Не указана'}
                        </td>

                        {/* Column 4: Current Status Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                              📝 Черновик
                            </span>
                          ) : product.inStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/30">
                              <span className="w-2 h-2 rounded-full bg-[#A3E635]"></span>
                              В НАЛИЧИИ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              ПРОДАНО
                            </span>
                          )}
                        </td>

                        {/* Column 5: 1-CLICK TOGGLE BUTTON FOR STAFF */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleStock(product)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              product.inStock
                                ? 'bg-red-500/15 border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white'
                                : 'bg-[#A3E635]/15 border border-[#A3E635]/60 text-[#A3E635] hover:bg-[#A3E635] hover:text-[#09090B]'
                            } disabled:opacity-50`}
                          >
                            {isUpdating ? (
                              <span>Обновляем...</span>
                            ) : product.inStock ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>✕ Отметить ПРОДАНО</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>✓ Вернуть В НАЛИЧИЕ</span>
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
                              title="Открыть страницу товара на сайте"
                              className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {product.images[0] && (
                              <button
                                type="button"
                                title="Скачать фото"
                                onClick={async () => {
                                  await downloadProductPhoto(product.images[0], displayTitle, 0);
                                  showToast('Скачивание фото начато');
                                }}
                                className="p-2 text-zinc-400 hover:text-[#A3E635] cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}

                            {!usingFallbackSeed && (
                              <button
                                type="button"
                                title={isDraft ? 'Опубликовать товар' : 'Скрыть в черновики'}
                                onClick={() => {
                                  if (isDraft && (product.price <= 0 || product.title.trim().length < 2)) {
                                    setEditingProduct(product);
                                    setShowProductModal(true);
                                  } else {
                                    void setProductStatus(
                                      product.id,
                                      isDraft ? 'published' : 'draft'
                                    );
                                  }
                                }}
                                className="p-2 text-zinc-400 hover:text-[#A3E635] cursor-pointer"
                              >
                                {isDraft ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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

                            {!usingFallbackSeed && (
                              <button
                                type="button"
                                title="Удалить товар"
                                onClick={() => deleteProduct(product.id)}
                                className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VK ALBUM IMPORT */}
      {activeTab === 'vk' && (
        <AdminVkSyncTab
          onOpenDrafts={() => {
            setStockFilter('draft');
            setActiveTab('inventory');
          }}
        />
      )}

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
