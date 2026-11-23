import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Heart,
  MessageCircle,
  PackageCheck,
  Ruler,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
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
  const { products, fittingIds, toggleFitting, wishlistIds, toggleWishlist, isAdmin, setProductInStock } =
    useStore();
  const product = products.find((p) => p.id === productId);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  useEffect(() => {
    setSelectedImageIdx(0);
    setSelectedSize(product?.sizes[0] || null);
  }, [productId, product]);

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-5">
        <h1 className="font-display text-3xl text-white uppercase">Товар не найден</h1>
        <p className="text-sm text-zinc-400">
          Возможно, эта позиция была удалена или перемещена.
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

  const orderTelegramUrl = `${BRAND_INFO.supportUrl}?text=${encodeURIComponent(
    `Привет, Никита! Хочу заказать эту вещь:
📦 ${product.title}
📏 Размер: ${selectedSize || product.sizes.join(', ') || 'ONE SIZE'}
💰 Цена: ${product.price} BYN
🔗 Ссылка: https://second-hand-sitea.vercel.app/#/product/${product.id}`
  )}`;

  const askSimilarUrl = `${BRAND_INFO.supportUrl}?text=${encodeURIComponent(
    `Привет, Никита! Интересует похожая вещь на эту (уже продана): ${product.title} (была за ${product.price} BYN). Есть ли что-то похожее в шоуруме или в новых дропах?`
  )}`;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
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
          <div className="relative aspect-[3/4] w-full bg-[#141417] border border-zinc-800/80 overflow-hidden">
            <SafeImage
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.title}
              className={`w-full h-full object-cover ${!product.inStock ? 'opacity-60 grayscale' : ''}`}
              fallbackLabel={product.title}
            />

            {/* In-Stock / Sold Badge on Image */}
            <div className="absolute top-4 left-4 z-10">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-[#09090B]/95 text-[#A3E635] border border-[#A3E635] shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#A3E635] animate-pulse" />
                  В наличии в Минске
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-zinc-900/95 text-zinc-400 border border-zinc-600 line-through shadow-lg">
                  <XCircle className="w-3.5 h-3.5" />
                  Продано
                </span>
              )}
            </div>
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

        {/* Purchase & Stock Module Right */}
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
              <span className={product.inStock ? 'text-[#A3E635] font-semibold' : 'text-zinc-500'}>
                {product.inStock ? 'В наличии' : 'Продано'}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight uppercase">
              {product.title}
            </h1>

            <p className="font-mono tabular-nums text-3xl font-bold text-[#A3E635]">
              {formatPriceBYN(product.price)}
            </p>
          </div>

          {/* Employee Quick Control Box (When Logged in as Admin) */}
          {isAdmin && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Учёт наличия (Сотрудник)
                </span>
                <span className={`text-xs font-bold ${product.inStock ? 'text-[#A3E635]' : 'text-zinc-500'}`}>
                  {product.inStock ? '● В наличии' : '○ Продано'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProductInStock(product.id, !product.inStock)}
                className={`w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  product.inStock
                    ? 'bg-red-950/60 border border-red-800 text-red-200 hover:bg-red-900'
                    : 'bg-lime-950/60 border border-lime-800 text-lime-200 hover:bg-lime-900'
                }`}
              >
                {product.inStock ? '✕ Отметить как ПРОДАНО' : '✓ Вернуть В НАЛИЧИЕ'}
              </button>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-zinc-300 font-medium uppercase tracking-wider">
                Доступный размер
              </span>
              <span className="text-zinc-500 font-mono">В 1 экземпляре</span>
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

          {/* Primary Action Button: Order via Nikita in Telegram */}
          <div className="space-y-3">
            {product.inStock ? (
              <a
                href={orderTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="neon-btn w-full py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 bg-[#A3E635] text-[#09090B] hover:bg-lime-300 transition-colors cursor-pointer shadow-md"
              >
                <MessageCircle className="w-5 h-5 fill-current" aria-hidden="true" />
                <span>Заказать у Никиты @NikitaZombie 🛹</span>
              </a>
            ) : (
              <div className="space-y-2">
                <div className="w-full py-3.5 px-6 bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Товар уже продан</span>
                </div>
                <a
                  href={askSimilarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-transparent border border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Спросить у Никиты похожую вещь в Telegram</span>
                </a>
              </div>
            )}

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
                className="vintage-wishlist-btn min-w-[44px] min-h-[44px] px-3.5 border border-zinc-700 bg-[#09090B] text-zinc-200 inline-flex items-center justify-center cursor-pointer hover:border-white transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${isWishlisted ? 'fill-[#FF2E93] text-[#FF2E93]' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Measurements */}
          {measurementRows.length > 0 && (
            <div className="space-y-3 border-t border-zinc-800/80 pt-5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Замеры изделия (см)
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {measurementRows.map((m) => (
                  <div key={m.label} className="bg-[#09090B] border border-zinc-800 p-2.5 text-center">
                    <p className="text-[11px] text-zinc-500">{m.label}</p>
                    <p className="font-mono text-sm font-semibold text-zinc-100 mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="space-y-2 border-t border-zinc-800/80 pt-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Описание
              </h2>
              <p>{product.description}</p>
            </div>
          )}

          {/* Showroom & Delivery Info */}
          <div className="border-t border-zinc-800/80 pt-5 space-y-2.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <PackageCheck className="w-4 h-4 text-[#A3E635]" />
              <span>{BRAND_INFO.address}</span>
            </div>
            <p className="pl-6">
              Примерка ежедневно · {BRAND_INFO.hoursWeekdays} · {BRAND_INFO.hoursWeekend}
            </p>
            <div className="flex items-center gap-2 text-zinc-300 pt-1">
              <Truck className="w-4 h-4 text-zinc-500" />
              <span>{BRAND_INFO.deliverySummary}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
