import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, CornerDownRight, Search, SlidersHorizontal, X, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductCategory, ProductSize } from '../types/store';
import { ALL_SIZES, CATEGORY_LABELS, CATEGORY_SUBCATEGORIES, PRODUCT_CATEGORIES } from '../types/store';
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
  const [subCategory, setSubCategory] = useState<string>('all');
  const [selectedSizes, setSelectedSizes] = useState<ProductSize[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'sold'>(
    initialInStock === true ? 'inStock' : 'all'
  );
  const [visibleLimit, setVisibleLimit] = useState(48);

  const handleSelectCategory = (newCat: ProductCategory | 'all') => {
    setCategory(newCat);
    setSubCategory('all');
  };

  const handleToggleSize = (sz: ProductSize) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const handlePricePreset = (min: string, max: string) => {
    if (minPrice === min && maxPrice === max) {
      setMinPrice('');
      setMaxPrice('');
    } else {
      setMinPrice(min);
      setMaxPrice(max);
    }
  };

  // Sub-tabs calculation for active category (only computed when a category is selected)
  const activeCategorySubTabs = useMemo(() => {
    if (category === 'all') return [];
    const subDefs = CATEGORY_SUBCATEGORIES[category] || [];
    const catProducts = products.filter((p) => p.category === category);

    const list = subDefs.map((def) => {
      const count = catProducts.filter((p) => def.match(p.title || '', p.description || '')).length;
      return {
        key: def.key,
        label: def.label,
        count,
      };
    });

    return [
      { key: 'all', label: 'Все', count: catProducts.length },
      ...list,
    ];
  }, [category, products]);

  const filteredProducts = useMemo(() => {
    let result = products.slice();

    // Category
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // Sub-category (подвкладка)
    if (category !== 'all' && subCategory !== 'all') {
      const subDefs = CATEGORY_SUBCATEGORIES[category];
      const selectedDef = subDefs?.find((s) => s.key === subCategory);
      if (selectedDef) {
        result = result.filter((p) => selectedDef.match(p.title || '', p.description || ''));
      }
    }

    // Sizes (Multi-select: match items containing ANY of the selected sizes)
    if (selectedSizes.length > 0) {
      result = result.filter((p) => p.sizes.some((sz) => selectedSizes.includes(sz)));
    }

    // Price Filter (Min and/or Max BYN)
    if (minPrice.trim() !== '') {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => p.price >= min);
      }
    }
    if (maxPrice.trim() !== '') {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => p.price <= max);
      }
    }

    // Stock
    if (stockFilter === 'inStock') {
      result = result.filter((p) => p.inStock);
    } else if (stockFilter === 'sold') {
      result = result.filter((p) => !p.inStock);
    }

    // Search (title, description, era, sizes) - multi-word match
    const q = search.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      result = result.filter((p) => {
        const text = `${p.title} ${p.description} ${p.era} ${p.condition} ${p.sizes.join(' ')}`.toLowerCase();
        return words.every((w) => text.includes(w));
      });
    }

    // Sort
    if (sort === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, category, subCategory, selectedSizes, minPrice, maxPrice, stockFilter, search, sort]);

  // Reset pagination limit when filters change
  React.useEffect(() => {
    setVisibleLimit(48);
  }, [category, subCategory, selectedSizes, minPrice, maxPrice, stockFilter, search, sort]);

  const inStockCount = useMemo(() => products.filter((p) => p.inStock).length, [products]);
  const soldCount = useMemo(() => products.filter((p) => !p.inStock).length, [products]);

  const resetFilters = () => {
    setCategory('all');
    setSubCategory('all');
    setSelectedSizes([]);
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
    setSort('newest');
    setStockFilter('all');
  };

  const hasActiveFilters =
    category !== 'all' ||
    subCategory !== 'all' ||
    selectedSizes.length > 0 ||
    minPrice.trim() !== '' ||
    maxPrice.trim() !== '' ||
    search.trim().length > 0 ||
    stockFilter !== 'all';

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
              onClick={() => handleSelectCategory('all')}
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
                onClick={() => handleSelectCategory(cat.key)}
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

        {/* Dynamic Sub-tabs Row (Подвкладка: появляется при нажатии на категорию) */}
        {activeCategorySubTabs.length > 0 && (
          <div className="pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 shrink-0 flex items-center gap-1.5 mr-1">
              <CornerDownRight className="w-3.5 h-3.5 text-[#A3E635]" aria-hidden="true" />
              <span>Подвкладка:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeCategorySubTabs.map((sub) => {
                const isSelected = subCategory === sub.key;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => setSubCategory(sub.key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#A3E635] text-[#09090B] font-bold shadow-sm shadow-lime-950/50'
                        : 'bg-[#18181B] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    <span>{sub.label}</span>
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-[#09090B]/25 text-[#09090B] font-bold'
                          : 'bg-zinc-800/90 text-zinc-400'
                      }`}
                    >
                      {sub.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size & Price Filters Bar */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3.5">
          {/* Row 1: Multi-select Sizes & Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Размеры">
              <span className="text-xs font-medium text-zinc-400 mr-1 flex items-center gap-1.5">
                <span>Размеры:</span>
                {selectedSizes.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#A3E635] text-[#09090B] font-bold rounded">
                    {selectedSizes.length}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSizes([])}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  selectedSizes.length === 0
                    ? 'bg-zinc-100 text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Все
              </button>
              {ALL_SIZES.map((sz) => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleToggleSize(sz)}
                    className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#A3E635] text-[#09090B] font-bold shadow-sm shadow-lime-950/40 ring-1 ring-[#A3E635]'
                        : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
              {selectedSizes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSizes([])}
                  className="text-[11px] text-zinc-500 hover:text-[#A3E635] ml-1 underline cursor-pointer"
                >
                  сбросить размеры
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
              <span className="text-xs text-zinc-500">Сортировка:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="px-3 py-1.5 bg-[#09090B] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#A3E635] cursor-pointer"
              >
                <option value="newest">Сначала новые</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-zinc-400 hover:text-[#A3E635] underline cursor-pointer whitespace-nowrap"
                >
                  Сбросить всё
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Price Range Filter & Presets */}
          <div className="pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-zinc-400">Цена (BYN):</span>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#09090B] border border-zinc-800 px-2.5 py-1 focus-within:border-[#A3E635]">
                <span className="text-xs text-zinc-500 mr-1.5 font-mono">от</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-14 bg-transparent text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <span className="text-zinc-600">—</span>

              <div className="flex items-center bg-[#09090B] border border-zinc-800 px-2.5 py-1 focus-within:border-[#A3E635]">
                <span className="text-xs text-zinc-500 mr-1.5 font-mono">до</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  placeholder="340"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-14 bg-transparent text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-2">
              <button
                type="button"
                onClick={() => handlePricePreset('', '50')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  minPrice === '' && maxPrice === '50'
                    ? 'bg-[#A3E635] text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                до 50 BYN
              </button>
              <button
                type="button"
                onClick={() => handlePricePreset('50', '100')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  minPrice === '50' && maxPrice === '100'
                    ? 'bg-[#A3E635] text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                50 – 100 BYN
              </button>
              <button
                type="button"
                onClick={() => handlePricePreset('100', '')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  minPrice === '100' && maxPrice === ''
                    ? 'bg-[#A3E635] text-[#09090B] font-bold'
                    : 'bg-[#18181B] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                от 100 BYN
              </button>
              {(minPrice !== '' || maxPrice !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-[#A3E635] ml-1 underline cursor-pointer"
                >
                  очистить цену
                </button>
              )}
            </div>
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
