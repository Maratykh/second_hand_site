import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Heart,
  MapPin,
  Ruler,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO, CATEGORY_LABELS } from '../types/store';
import { formatMeasurementValue, formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import type { AppRoute } from '../components/Header';

interface FittingsPageProps {
  initialTab?: 'fittings' | 'favorites';
  onNavigate: (route: AppRoute) => void;
}

export const FittingsPage: React.FC<FittingsPageProps> = ({
  initialTab = 'fittings',
  onNavigate,
}) => {
  const {
    products,
    fittingIds,
    fittingNotes,
    toggleFitting,
    setFittingNote,
    clearFittings,
    wishlistIds,
    toggleWishlist,
    clearWishlist,
    addToCart,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'fittings' | 'favorites'>(initialTab);

  const fittingProducts = useMemo(
    () =>
      fittingIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [fittingIds, products]
  );

  const wishlistProducts = useMemo(
    () =>
      wishlistIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [wishlistIds, products]
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">
            Личный блокнот покупателя
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white uppercase tracking-tight">
            Мои примерки
          </h1>
        </div>

        <div
          className="inline-flex p-1 bg-[#111114] border border-zinc-800 self-start md:self-auto"
          role="tablist"
          aria-label="Списки покупателя"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fittings'}
            onClick={() => setActiveTab('fittings')}
            className={`px-4 py-2 min-h-[40px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'fittings'
                ? 'bg-[#A3E635] text-[#09090B]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">Хочу померить ({fittingProducts.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'favorites'}
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 min-h-[40px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'bg-[#FF2E93] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">Избранное ({wishlistProducts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FITTING NOTEBOOK */}
      {activeTab === 'fittings' && (
        <div className="space-y-6">
          {/* Showroom Reminder Strip */}
          <div className="bg-[#111114] border border-zinc-800/80 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <MapPin className="w-5 h-5 text-[#A3E635] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-white">
                  Шоурум в Минске: {BRAND_INFO.address}
                </p>
                <p className="text-xs text-zinc-400">
                  {BRAND_INFO.hoursWeekdays} · {BRAND_INFO.hoursWeekend}. Список сохраняется в вашем браузере — откройте его на телефоне, когда придёте в шоурум.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={BRAND_INFO.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] border border-zinc-700 text-xs font-medium text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] transition-colors whitespace-nowrap"
              >
                <span>Уточнить наличие в TG ({BRAND_INFO.supportHandle})</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>

              {fittingProducts.length > 0 && (
                <button
                  type="button"
                  onClick={clearFittings}
                  className="px-4 py-2.5 min-h-[40px] border border-zinc-800 text-xs text-zinc-400 hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
                >
                  Очистить список
                </button>
              )}
            </div>
          </div>

          {fittingProducts.length === 0 ? (
            <div className="bg-[#111114] border border-zinc-800/80 p-10 sm:p-14 text-center space-y-5">
              <Ruler className="w-8 h-8 text-zinc-600 mx-auto" aria-hidden="true" />
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-display text-2xl font-bold text-white uppercase">
                  Список примерок пока пуст
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Нажимайте кнопку «Померить» на карточках в каталоге или внутри товара — вещи сохранятся здесь, чтобы вы легко нашли их в шоуруме.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'catalog' })}
                className="neon-btn inline-flex items-center gap-2 px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors cursor-pointer"
              >
                <span>Перейти в каталог</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="fittings-list">
              {fittingProducts.map((product) => {
                const defaultSize = product.sizes[0] || 'ONE SIZE';
                const noteValue = fittingNotes[product.id] || '';
                const m = product.measurements;
                const hasMeasurements = Boolean(m?.length || m?.width || m?.sleeve);

                return (
                  <article
                    key={product.id}
                    className="bg-[#111114] border border-zinc-800/80 p-4 sm:p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex gap-4">
                      <a
                        href={`#/product/${product.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate({ page: 'product', productId: product.id });
                        }}
                        className="w-24 sm:w-28 aspect-[3/4] shrink-0 bg-[#141417] border border-zinc-800 overflow-hidden"
                      >
                        <SafeImage
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </a>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{CATEGORY_LABELS[product.category]}</span>
                          {product.era && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{product.era}</span>
                            </>
                          )}
                        </div>

                        <a
                          href={`#/product/${product.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate({ page: 'product', productId: product.id });
                          }}
                          className="block text-base font-semibold text-white hover:text-[#A3E635] transition-colors line-clamp-2"
                        >
                          {product.title.trim() || 'Винтажная позиция'}
                        </a>

                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <span className="font-mono tabular-nums text-base font-semibold text-[#A3E635]">
                            {formatPriceBYN(product.price)}
                          </span>
                          <span className="font-mono text-xs text-zinc-400">
                            Размер: {product.sizes.join(' / ')}
                          </span>
                        </div>

                        {hasMeasurements && (
                          <p className="text-xs font-mono text-zinc-400 tabular-nums">
                            {[
                              m?.length ? `Длина: ${formatMeasurementValue(m.length)}` : null,
                              m?.width ? `Ширина: ${formatMeasurementValue(m.width)}` : null,
                              m?.sleeve ? `Рукав: ${formatMeasurementValue(m.sleeve)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Personal Fitting Note */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`fitting-note-${product.id}`}
                        className="block text-xs text-zinc-400"
                      >
                        Заметка для примерки
                      </label>
                      <input
                        id={`fitting-note-${product.id}`}
                        type="text"
                        maxLength={200}
                        value={noteValue}
                        onChange={(e) => setFittingNote(product.id, e.target.value)}
                        placeholder="Например: примерить с худи, проверить посадку плеч"
                        className="w-full px-3 py-2 bg-[#09090B] border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800/70">
                      <button
                        type="button"
                        disabled={!product.inStock}
                        onClick={() => addToCart(product, defaultSize, 1)}
                        className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] bg-[#A3E635] text-[#09090B] text-xs font-bold hover:bg-lime-300 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{product.inStock ? 'В корзину' : 'Продано'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFitting(product)}
                        aria-label={`Убрать «${product.title}» из примерок`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Убрать</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FAVORITES / WISHLIST */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          {wishlistProducts.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearWishlist}
                className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Очистить избранное
              </button>
            </div>
          )}

          {wishlistProducts.length === 0 ? (
            <div className="bg-[#111114] border border-zinc-800/80 p-10 sm:p-14 text-center space-y-5">
              <Heart className="w-8 h-8 text-zinc-600 mx-auto" aria-hidden="true" />
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-display text-2xl font-bold text-white uppercase">
                  В избранном пока пусто
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Отмечайте понравившиеся вещи сердечком, чтобы не потерять их при следующих обновлениях.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'catalog' })}
                className="neon-btn inline-flex items-center gap-2 px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors cursor-pointer"
              >
                <span>Открыть каталог</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="favorites-list">
              {wishlistProducts.map((product) => {
                const isFitting = fittingIds.includes(product.id);
                const defaultSize = product.sizes[0] || 'ONE SIZE';
                return (
                  <article
                    key={product.id}
                    className="bg-[#111114] border border-zinc-800/80 p-4 sm:p-5 flex gap-4"
                  >
                    <a
                      href={`#/product/${product.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate({ page: 'product', productId: product.id });
                      }}
                      className="w-24 aspect-[3/4] shrink-0 bg-[#141417] border border-zinc-800 overflow-hidden"
                    >
                      <SafeImage
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </a>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <a
                          href={`#/product/${product.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate({ page: 'product', productId: product.id });
                          }}
                          className="block text-base font-semibold text-white hover:text-[#A3E635] transition-colors line-clamp-2"
                        >
                          {product.title.trim() || 'Винтажная позиция'}
                        </a>
                        <p className="font-mono tabular-nums text-sm font-semibold text-[#A3E635]">
                          {formatPriceBYN(product.price)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFitting(product)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] border text-xs font-semibold cursor-pointer ${
                            isFitting
                              ? 'border-[#A3E635] text-[#A3E635] bg-[#A3E635]/10'
                              : 'border-zinc-700 text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635]'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isFitting ? 'В примерках' : 'Померить'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={!product.inStock}
                          onClick={() => addToCart(product, defaultSize, 1)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-[#A3E635] text-[#09090B] text-xs font-bold hover:bg-lime-300 disabled:opacity-40 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>В корзину</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleWishlist(product)}
                          aria-label={`Убрать «${product.title}» из избранного`}
                          className="p-2 min-h-[40px] text-zinc-400 hover:text-red-400 cursor-pointer ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
