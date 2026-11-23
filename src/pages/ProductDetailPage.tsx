import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart, Ruler, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductSize } from '../types/store';
import { BRAND_INFO, CATEGORY_LABELS } from '../types/store';
import { formatMeasurementValue, formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import type { AppRoute } from '../components/Header';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (route: AppRoute) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
}) => {
  const { products, addToCart, fittingIds, toggleFitting, wishlistIds, toggleWishlist } =
    useStore();
  const product = products.find((p) => p.id === productId);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    setSelectedImageIdx(0);
    setSelectedSize(product?.sizes[0] || null);
    setAddedFeedback(false);
  }, [productId, product]);

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-5">
        <h1 className="font-display text-3xl text-white uppercase">Товар не найден</h1>
        <p className="text-sm text-zinc-400">
          Возможно, эта винтажная позиция уже продана или снята с публикации.
        </p>
        <button
          type="button"
          onClick={() => onNavigate({ page: 'catalog' })}
          className="px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-semibold hover:bg-lime-300 transition-colors cursor-pointer"
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  const isFitting = fittingIds.includes(product.id);
  const isWishlisted = wishlistIds.includes(product.id);

  const measurementRows = [
    { label: 'Длина', value: formatMeasurementValue(product.measurements?.length) },
    { label: 'Ширина', value: formatMeasurementValue(product.measurements?.width) },
    { label: 'Рукав', value: formatMeasurementValue(product.measurements?.sleeve) },
  ].filter((row) => row.value.length > 0);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    const sizeToUse = selectedSize || product.sizes[0] || 'ONE SIZE';
    addToCart(product, sizeToUse, 1);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        type="button"
        onClick={() => onNavigate({ page: 'catalog' })}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Назад в каталог</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[3/4] w-full bg-[#141417] border border-zinc-800/80 overflow-hidden">
            <SafeImage
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover"
              fallbackLabel={product.title}
            />
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`Показать фото ${idx + 1}`}
                  className={`aspect-[3/4] bg-[#141417] border overflow-hidden cursor-pointer transition-colors ${
                    idx === selectedImageIdx
                      ? 'border-[#A3E635]'
                      : 'border-zinc-800 hover:border-zinc-500'
                  }`}
                >
                  <SafeImage
                    src={imgUrl}
                    alt={`${product.title} — фото ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contiguous Purchase Module Right */}
        <div className="lg:col-span-5 bg-[#111114] border border-zinc-800/80 p-6 sm:p-8 space-y-7 lg:sticky lg:top-24">
          <div className="space-y-3 border-b border-zinc-800/80 pb-6">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{CATEGORY_LABELS[product.category]}</span>
              {product.era && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.era}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{product.inStock ? 'В наличии' : 'Продано'}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight uppercase">
              {product.title}
            </h1>

            <p className="font-mono tabular-nums text-2xl font-semibold text-[#A3E635]">
              {formatPriceBYN(product.price)}
            </p>
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-zinc-300 font-medium uppercase tracking-wider">
                Выберите размер
              </span>
              <a
                href={BRAND_INFO.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 underline decoration-zinc-700 hover:text-[#A3E635]"
              >
                Спросить в TG ({BRAND_INFO.supportHandle})
              </a>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Размер товара">
              {product.sizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[52px] h-11 px-4 font-mono text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 text-[#09090B] font-bold border border-zinc-100'
                        : 'bg-[#09090B] text-zinc-300 border border-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Add to Cart + Fitting Notebook + Wishlist */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={!product.inStock}
              onClick={handleAddToCart}
              className={`neon-btn w-full py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-colors ${
                !product.inStock
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : addedFeedback
                    ? 'bg-zinc-100 text-[#09090B] cursor-pointer'
                    : 'bg-[#A3E635] text-[#09090B] hover:bg-lime-300 cursor-pointer'
              }`}
            >
              {addedFeedback ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Добавлено в корзину</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>{product.inStock ? 'Добавить в корзину' : 'Нет в наличии'}</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <button
                type="button"
                aria-pressed={isFitting}
                onClick={() => toggleFitting(product)}
                className={`min-h-[44px] px-4 py-2.5 border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isFitting
                    ? 'border-[#A3E635] bg-[#A3E635]/15 text-[#A3E635]'
                    : 'border-zinc-700 bg-[#09090B] text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635]'
                }`}
              >
                <Ruler className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isFitting ? 'В списке «Хочу померить»' : 'Померить в шоуруме'}</span>
              </button>

              <button
                type="button"
                data-active={isWishlisted}
                aria-pressed={isWishlisted}
                aria-label={isWishlisted ? 'Убрать из избранного' : 'Добавить в избранное'}
                onClick={() => toggleWishlist(product)}
                className="vintage-wishlist-btn min-w-[44px] min-h-[44px] px-3.5 border border-zinc-700 bg-[#09090B] text-zinc-200 inline-flex items-center justify-center cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${isWishlisted ? 'fill-[#FF2E93] text-[#FF2E93]' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {isFitting && (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'fittings', tab: 'fittings' })}
                className="w-full py-2.5 px-4 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-[#A3E635] hover:border-[#A3E635]/50 transition-colors cursor-pointer"
              >
                Открыть «Мои примерки» →
              </button>
            )}

            {addedFeedback && (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'cart' })}
                className="w-full py-3 px-5 border border-zinc-700 text-zinc-200 text-sm font-medium hover:border-white hover:text-white transition-colors cursor-pointer"
              >
                Перейти в корзину и оформить
              </button>
            )}
          </div>

          {/* Measurements Table */}
          {measurementRows.length > 0 && (
            <div className="space-y-2.5 pt-4 border-t border-zinc-800/80">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Замеры изделия
              </h2>
              <div className="border border-zinc-800/80 bg-[#09090B] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-zinc-800/70">
                    {measurementRows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="px-4 py-2.5 font-medium text-zinc-400">
                          {row.label}
                        </th>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-right text-zinc-100">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Description & Specs */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/80 text-sm">
            {product.description && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Описание
                </h2>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {(product.condition || product.era) && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800/60 text-xs">
                {product.condition && (
                  <div>
                    <p className="text-zinc-500">Состояние</p>
                    <p className="text-zinc-200 mt-0.5">{product.condition}</p>
                  </div>
                )}
                {product.era && (
                  <div>
                    <p className="text-zinc-500">Эпоха</p>
                    <p className="text-zinc-200 mt-0.5">{product.era}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800/60 flex items-start gap-3 text-xs text-zinc-400">
              <Truck className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-zinc-200 font-medium">{BRAND_INFO.deliverySummary}</p>
                <p>Самовывоз и примерка: {BRAND_INFO.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
