import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductCategory, ProductSize } from '../types/store';
import { ALL_SIZES, CATEGORY_LABELS, PRODUCT_CATEGORIES } from '../types/store';
import { filterAndSortProducts, type CatalogFilters } from '../utils/storeLogic';
import { ProductCard } from '../components/ProductCard';
import type { AppRoute } from '../components/Header';

interface CatalogPageProps {
  initialCategory?: string;
  onNavigate: (route: AppRoute) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ initialCategory, onNavigate }) => {
  const { products, productsLoading } = useStore();

  const validInitialCat: ProductCategory | 'all' = PRODUCT_CATEGORIES.some(
    (c) => c.key === initialCategory
  )
    ? (initialCategory as ProductCategory)
    : 'all';

  const [category, setCategory] = useState<ProductCategory | 'all'>(validInitialCat);
  const [size, setSize] = useState<ProductSize | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CatalogFilters['sort']>('newest');
  const [onlyInStock, setOnlyInStock] = useState(true);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        category,
        size,
        search,
        sort,
        onlyInStock,
      }),
    [products, category, size, search, sort, onlyInStock]
  );

  const hasActiveFilters =
    category !== 'all' || size !== 'all' || search.trim().length > 0 || !onlyInStock;

  const resetFilters = () => {
    setCategory('all');
    setSize('all');
    setSearch('');
    setSort('newest');
    setOnlyInStock(true);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Селективный архив</p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white uppercase tracking-tight mt-1">
            Каталог одежды
          </h1>
        </div>
        <p className="font-mono text-xs text-zinc-400 tabular-nums" data-testid="catalog-count">
          Найдено позиций: {filteredProducts.length}
        </p>
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
              Все
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

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="relative">
              <label htmlFor="catalog-search" className="sr-only">
                Поиск по названию или эпохе
              </label>
              <Search
                className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск: кожа, 1990s, деним..."
                className="w-full sm:w-60 pl-9 pr-3 py-2 bg-[#09090B] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div>
              <label htmlFor="catalog-sort" className="sr-only">
                Сортировка
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as CatalogFilters['sort'])}
                className="w-full sm:w-auto px-3 py-2 bg-[#09090B] border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-[#A3E635]"
              >
                <option value="newest">Сначала новые</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
              </select>
            </div>
          </div>
        </div>

        {/* Size Filter Row */}
        <div className="pt-4 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Размеры">
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Размер:
            </span>
            <button
              type="button"
              onClick={() => setSize('all')}
              className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                size === 'all'
                  ? 'bg-zinc-100 text-[#09090B] font-semibold'
                  : 'bg-[#09090B] text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              Любой
            </button>
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                  size === s
                    ? 'bg-zinc-100 text-[#09090B] font-semibold'
                    : 'bg-[#09090B] text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="accent-[#A3E635] w-4 h-4"
              />
              Только в наличии
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Сбросить
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-[#111114] border border-zinc-800 aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#111114] border border-zinc-800/80 p-12 text-center space-y-4">
          <h2 className="font-display text-2xl text-white uppercase">Позиции не найдены</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            По выбранным фильтрам сейчас ничего нет. Попробуйте сбросить фильтры или загляните в наши альбомы VK.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-5 py-2.5 bg-[#A3E635] text-[#09090B] text-sm font-semibold hover:bg-lime-300 transition-colors cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7" data-testid="product-grid">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              index={idx}
              onSelect={(id) => onNavigate({ page: 'product', productId: id })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
