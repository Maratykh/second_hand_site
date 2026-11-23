import React, { useMemo, useState } from 'react';
import {
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  LogIn,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { OrderStatus, Product, ProductStatus } from '../types/store';
import {
  ADMIN_EMAIL,
  CATEGORY_LABELS,
  DELIVERY_METHODS,
  ORDER_STATUS_LABELS,
  PRODUCT_STATUS_LABELS,
} from '../types/store';
import { downloadProductPhoto } from '../utils/downloadImage';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import { AdminProductFormModal } from '../components/admin/AdminProductFormModal';
import { AdminVkSyncTab } from '../components/admin/AdminVkSyncTab';

type AdminTab = 'dashboard' | 'products' | 'vk';
type ProductFilter = 'all' | ProductStatus;

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
    deleteProduct,
    adminOrders,
    newOrdersCount,
    updateOrderStatus,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const draftsCount = useMemo(
    () => adminProducts.filter((p) => p.status === 'draft').length,
    [adminProducts]
  );

  const publishedCount = useMemo(
    () => adminProducts.filter((p) => p.status !== 'draft').length,
    [adminProducts]
  );

  const visibleAdminProducts = useMemo(() => {
    if (productFilter === 'draft') {
      return adminProducts.filter((p) => p.status === 'draft');
    }
    if (productFilter === 'published') {
      return adminProducts.filter((p) => p.status !== 'draft');
    }
    return adminProducts;
  }, [adminProducts, productFilter]);

  const totalRevenue = useMemo(
    () =>
      adminOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [adminOrders]
  );

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
              : `Для управления товарами, черновиками из ВК и заказами войдите через Google-аккаунт администратора (${ADMIN_EMAIL}).`}
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">
            Управление магазином · {user.email}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-1">
            Админ-панель Лавка Зомби
          </h1>
        </div>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#111114] border border-zinc-800" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#A3E635] text-[#09090B]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Заказы ({adminOrders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#A3E635] text-[#09090B]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Товары ({adminProducts.length}
            {draftsCount > 0 ? ` · черн. ${draftsCount}` : ''})
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
            Импорт из ВК
          </button>
        </div>
      </div>

      {/* TAB 1: DASHBOARD & ORDERS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111114] border border-zinc-800/80 p-5 space-y-1">
              <p className="text-xs text-zinc-500">Новые заказы (ждут обработки)</p>
              <p className="font-mono tabular-nums text-3xl font-bold text-[#A3E635]">
                {newOrdersCount}
              </p>
            </div>
            <div className="bg-[#111114] border border-zinc-800/80 p-5 space-y-1">
              <p className="text-xs text-zinc-500">Всего заказов</p>
              <p className="font-mono tabular-nums text-3xl font-bold text-white">
                {adminOrders.length}
              </p>
            </div>
            <div className="bg-[#111114] border border-zinc-800/80 p-5 space-y-1">
              <p className="text-xs text-zinc-500">Сумма активных заказов</p>
              <p className="font-mono tabular-nums text-3xl font-bold text-white">
                {formatPriceBYN(totalRevenue)}
              </p>
            </div>
            <div className="bg-[#111114] border border-zinc-800/80 p-5 space-y-1">
              <p className="text-xs text-zinc-500">Черновики на проверке</p>
              <p className="font-mono tabular-nums text-3xl font-bold text-amber-400">
                {draftsCount}
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-white uppercase">
              Последние заказы
            </h2>

            {adminOrders.length === 0 ? (
              <div className="bg-[#111114] border border-zinc-800/80 p-10 text-center space-y-2">
                <ShoppingBag className="w-7 h-7 text-zinc-600 mx-auto" aria-hidden="true" />
                <p className="text-sm text-zinc-400">
                  Заказов пока нет. Как только покупатель оформит заказ, он мгновенно появится здесь.
                </p>
              </div>
            ) : (
              <div className="bg-[#111114] border border-zinc-800/80 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Заказ</th>
                      <th className="px-5 py-3.5 font-medium">Покупатель</th>
                      <th className="px-5 py-3.5 font-medium">Доставка</th>
                      <th className="px-5 py-3.5 font-medium">Позиции</th>
                      <th className="px-5 py-3.5 font-medium">Сумма</th>
                      <th className="px-5 py-3.5 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {adminOrders.map((order) => {
                      const deliveryLabel =
                        DELIVERY_METHODS.find((m) => m.key === order.deliveryMethod)?.label ||
                        order.deliveryMethod;
                      return (
                        <tr key={order.id} className="align-top hover:bg-[#16161A]">
                          <td className="px-5 py-4 font-mono text-xs text-white whitespace-nowrap">
                            {order.orderNumber}
                          </td>
                          <td className="px-5 py-4 space-y-0.5">
                            <p className="font-medium text-zinc-100">{order.customerName}</p>
                            <p className="font-mono text-xs text-zinc-400">{order.customerPhone}</p>
                            <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                          </td>
                          <td className="px-5 py-4 space-y-0.5 max-w-[240px]">
                            <p className="text-xs font-medium text-zinc-200">{deliveryLabel}</p>
                            <p className="text-xs text-zinc-400">{order.deliveryAddress}</p>
                            {order.comment && (
                              <p className="text-xs text-zinc-500 italic">«{order.comment}»</p>
                            )}
                          </td>
                          <td className="px-5 py-4 space-y-1 text-xs text-zinc-300">
                            {order.items.map((item, idx) => (
                              <p key={`${item.productId}-${idx}`}>
                                {item.title} ({item.size}) × {item.quantity}
                              </p>
                            ))}
                          </td>
                          <td className="px-5 py-4 font-mono tabular-nums font-semibold text-[#A3E635] whitespace-nowrap">
                            {formatPriceBYN(order.totalAmount)}
                          </td>
                          <td className="px-5 py-4">
                            <label htmlFor={`status-${order.id}`} className="sr-only">
                              Статус заказа {order.orderNumber}
                            </label>
                            <select
                              id={`status-${order.id}`}
                              value={order.status}
                              onChange={(e) =>
                                updateOrderStatus(order.id, e.target.value as OrderStatus)
                              }
                              className="px-2.5 py-1.5 bg-[#09090B] border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-[#A3E635]"
                            >
                              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                                <option key={st} value={st}>
                                  {ORDER_STATUS_LABELS[st]}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: PRODUCT MANAGEMENT (WITH DRAFTS & PUBLISHED) */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-white uppercase">
                Управление товарами и черновиками
              </h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по статусу">
                <button
                  type="button"
                  onClick={() => setProductFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    productFilter === 'all'
                      ? 'bg-zinc-100 text-[#09090B] font-semibold'
                      : 'bg-[#111114] border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Все ({adminProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('draft')}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    productFilter === 'draft'
                      ? 'bg-amber-400 text-[#09090B] font-semibold'
                      : 'bg-[#111114] border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Черновики ({draftsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('published')}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    productFilter === 'published'
                      ? 'bg-[#A3E635] text-[#09090B] font-semibold'
                      : 'bg-[#111114] border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Опубликованные ({publishedCount})
                </button>
              </div>
              {usingFallbackSeed && (
                <p className="text-xs text-amber-400">
                  Сейчас отображаются стартовые демо-позиции. Нажмите «Загрузить стартовый каталог в Firestore», чтобы редактировать их в базе.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {usingFallbackSeed && (
                <button
                  type="button"
                  disabled={seeding}
                  onClick={handleSeedDatabase}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-600 text-xs font-semibold text-zinc-100 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{seeding ? 'Сохраняем...' : 'Загрузить стартовый каталог в Firestore'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Добавить товар</span>
              </button>
            </div>
          </div>

          <div className="bg-[#111114] border border-zinc-800/80 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Товар</th>
                  <th className="px-5 py-3.5 font-medium">Категория</th>
                  <th className="px-5 py-3.5 font-medium">Размеры</th>
                  <th className="px-5 py-3.5 font-medium">Цена</th>
                  <th className="px-5 py-3.5 font-medium">Публикация</th>
                  <th className="px-5 py-3.5 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {visibleAdminProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-xs text-zinc-500">
                      Нет товаров в выбранном фильтре.
                    </td>
                  </tr>
                ) : (
                  visibleAdminProducts.map((product) => {
                    const isDraft = product.status === 'draft';
                    const displayTitle = product.title.trim() || 'Черновик (без названия)';
                    return (
                      <tr key={product.id} className="hover:bg-[#16161A]">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-14 bg-[#141417] border border-zinc-800 shrink-0 overflow-hidden">
                              <SafeImage
                                src={product.images[0]}
                                alt={displayTitle}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-100 truncate max-w-[260px]">
                                {displayTitle}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {product.era ? `${product.era} · ` : ''}
                                {product.inStock ? 'В наличии' : 'Продано'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-300">
                          {CATEGORY_LABELS[product.category]}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-400">
                          {product.sizes.join(', ')}
                        </td>
                        <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-[#A3E635] whitespace-nowrap">
                          {product.price > 0 ? formatPriceBYN(product.price) : 'Не указана'}
                        </td>
                        <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                          <span className={isDraft ? 'font-semibold text-amber-400' : 'text-[#A3E635]'}>
                            {PRODUCT_STATUS_LABELS[product.status || 'published']}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {product.images[0] && (
                              <button
                                type="button"
                                aria-label={`Скачать фото товара «${displayTitle}»`}
                                title="Скачать фото товара"
                                onClick={async () => {
                                  await downloadProductPhoto(product.images[0], displayTitle, 0);
                                  showToast('Скачивание фото начато');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="hidden xl:inline">Скачать фото</span>
                              </button>
                            )}

                            {!usingFallbackSeed && (
                              <button
                                type="button"
                                aria-label={
                                  isDraft
                                    ? `Опубликовать «${displayTitle}»`
                                    : `Скрыть «${displayTitle}» в черновики`
                                }
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer"
                              >
                                {isDraft ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Опубликовать</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>В черновик</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Редактировать «${displayTitle}»`}
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
                                aria-label={`Удалить «${displayTitle}»`}
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

      {/* TAB 3: PUBLIC VK ALBUM PHOTO IMPORT */}
      {activeTab === 'vk' && (
        <AdminVkSyncTab
          onOpenDrafts={() => {
            setProductFilter('draft');
            setActiveTab('products');
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
