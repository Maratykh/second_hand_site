import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Search, SlidersHorizontal, X, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductCategory, ProductSize } from '../types/store';
import { ALL_SIZES, CATEGORY_LABELS, PRODUCT_CATEGORIES } from '../types/store';
import { ProductCard } from '../components/ProductCard';
import type { AppRoute } from '../components/Header';

interface CatalogPageProps {
  initialCategory?: string;
  initialSearch?: string;
  initialInStock?: boolean;
  onNavigate: (route: AppRoute) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategory,
  initialSearch = '',
  initialInStock,
  onNavigate,
}) => {
  const { products, productsLoading, isAdmin } = useStore();

  const validInitialCat: ProductCategory | 'all' = PRODUCT_CATEGORIES.some(
    (c) => c.key === initialCategory
  )
    ? (initialCategory as ProductCategory)
    : 'all';

  const [category, setCategory] = useState<ProductCategory | 'all'>(validInitialCat);
  const [size, setSize] = useState<ProductSize | 'all'>('all');
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'sold'>(
    initialInStock === true ? 'inStock' : 'all'
  );
  const [visibleLimit, setVisibleLimit] = useState(48);

  const filteredProducts = useMemo(() => {
    let result = products.slice();

    // Category
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // Size
    if (size !== 'all') {
      result = result.filter((p) => p.sizes.includes(size));
    }

    // Stock
    if (stockFilter === 'inStock') {
      result = result.filter((p) => p.inStock);
    } else if (stockFilter === 'sold') {
      result = result.filter((p) => !p.inStock);
    }

    // Search (title, description, era, sizes)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const text = `${p.title} ${p.description} ${p.era} ${p.condition} ${p.sizes.join(' ')}`.toLowerCase();
        return text.includes(q);
      });
    }

    // Sort
    if (sort === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, category, size, stockFilter, search, sort]);

  const inStockCount = useMemo(() => products.filter((p) => p.inStock).length, [products]);
  const soldCount = useMemo(() => products.filter((p) => !p.inStock).length, [products]);

  const resetFilters = () => {
    setCategory('all');
    setSize('all');
    setSearch('');
    setSort('newest');
    setStockFilter('all');
  };

  const hasActiveFilters =
    category !== 'all' || size !== 'all' || search.trim().length > 0 || stockFilter !== 'all';

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header with Title and Fast Count */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">
            Проверка наличия товаров · Минск
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white uppercase tracking-tight mt-1">
            Каталог винтажа
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#A3E635] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A3E635] inline-block animate-pulse" />
            В наличии: {inStockCount}
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">Продано: {soldCount}</span>
        </div>
      </div>

      {/* Main Fast Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#A3E635] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Быстрый поиск: введите название, бренд, артикул, размер (например: Ellesse, джинсы, XL)..."
          className="w-full pl-12 pr-12 py-3.5 bg-[#111114] border border-zinc-800 text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <section aria-label="Фильтры каталога" className="space-y-5 bg-[#111114] border border-zinc-800/80 p-5">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Category Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Категории">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === 'all'
                  ? 'bg-[#A3E635] text-[#09090B] font-semibold'
                  : 'bg-[#18181B] text-zinc-300 hover:text-white border border-zinc-800'
              }`}
            >
              Все категории
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat.key
                    ? 'bg-[#A3E635] text-[#09090B] font-semibold'
                    : 'bg-[#18181B] text-zinc-300 hover:text-white border border-zinc-800'
                }`}
              >
                {CATEGORY_LABELS[cat.key]}
              </button>
            ))}
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-2 shrink-0 border-l border-zinc-800 pl-0 lg:pl-4">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-zinc-200 text-[#09090B] font-bold'
                  : 'bg-[#18181B] text-zinc-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('inStock')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'inStock'
                  ? 'bg-[#A3E635] text-[#09090B] font-bold'
                  : 'bg-[#18181B] text-lime-400 hover:bg-lime-950/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>В наличии ({inStockCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('sold')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'sold'
                  ? 'bg-zinc-600 text-white font-bold'
                  : 'bg-[#18181B] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Продано ({soldCount})</span>
            </button>
          </div>
        </div>

        {/* Size Filter Row & Sort */}
        <div className="pt-4 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Размеры">
            <span className="text-xs text-zinc-500 mr-1">Размер:</span>
            <button
              type="button"
              onClick={() => setSize('all')}
              className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                size === 'all'
                  ? 'bg-zinc-100 text-[#09090B] font-bold'
                  : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Все
            </button>
            {ALL_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSize(sz)}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  size === sz
                    ? 'bg-zinc-100 text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-1.5 bg-[#09090B] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#A3E635]"
            >
              <option value="newest">Сначала новые</option>
              <option value="price-asc">Сначала дешевле</option>
              <option value="price-desc">Сначала дороже</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-zinc-400 hover:text-[#A3E635] underline cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-[#111114] border border-zinc-800 aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#111114] border border-zinc-800/80 p-12 text-center space-y-4">
          <p className="font-display text-2xl font-bold text-white uppercase">
            Ничего не найдено
          </p>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            По вашему запросу «{search}» товаров не найдено. Попробуйте изменить параметры поиска или сбросить фильтры.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-6 py-2.5 bg-[#A3E635] text-[#09090B] text-xs font-bold hover:bg-lime-300 cursor-pointer"
          >
            Показать все товары
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.slice(0, visibleLimit).map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                onSelect={(id) => onNavigate({ page: 'product', productId: id })}
              />
            ))}
          </div>

          {filteredProducts.length > visibleLimit && (
            <div className="text-center pt-8">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 48)}
                className="px-8 py-3 bg-[#18181B] border border-zinc-700 hover:border-[#A3E635] text-white hover:text-[#A3E635] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Загрузить ещё ({visibleLimit} из {filteredProducts.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
