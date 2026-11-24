import React, { useState } from 'react';
import { Check, CheckCircle2, Edit3, Heart, MessageCircle, Ruler, Trash2, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { BRAND_INFO, CATEGORY_LABELS } from '../types/store';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';
import { ScrollReveal } from './ScrollReveal';

interface ProductCardProps {
  product: Product;
  onSelect: (productId: string) => void;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, index = 0 }) => {
  const { fittingIds, toggleFitting, wishlistIds, toggleWishlist, isAdmin, setProductInStock, deleteProduct } =
    useStore();

  const isFitting = fittingIds.includes(product.id);
  const isWishlisted = wishlistIds.includes(product.id);
  const displayTitle = product.title.trim() || 'Винтажная позиция';
  const delayMs = Math.min((index % 4) * 65, 195);

  const orderTelegramUrl = `${BRAND_INFO.supportUrl}?text=${encodeURIComponent(
    `Привет! Хочу заказать: ${displayTitle} (${product.sizes.join(', ') || 'размер не указан'}, ${product.price} BYN).\nТовар: https://lavkazombie.vercel.app/#/product/${product.id}`
  )}`;

  const handleToggleStock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await setProductInStock(product.id, !product.inStock);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(`Удалить вещь «${displayTitle}» из каталога?`)) {
      await deleteProduct(product.id);
    }
  };

  return (
    <ScrollReveal delayMs={delayMs} className="h-full">
      <article className="vintage-card group relative flex flex-col h-full bg-[#111114] border border-zinc-800/80 hover:border-zinc-700 transition-all">
        {/* Image + Stock Badge + Quick Wishlist */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#141417]">
          <a
            href={`#/product/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              onSelect(product.id);
            }}
            aria-label={`Открыть товар «${displayTitle}»`}
            className="block w-full h-full focus-visible:outline-2 focus-visible:outline-[#A3E635]"
          >
            <SafeImage
              src={product.images[0]}
              alt={displayTitle}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                !product.inStock ? 'opacity-50 grayscale' : ''
              }`}
              fallbackLabel={displayTitle}
            />

            {/* Availability Badge */}
            <div className="absolute top-3 left-3 z-10">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-[#09090B]/90 text-[#A3E635] border border-[#A3E635]/40 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635]" />
                  В наличии
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-zinc-900/95 text-zinc-400 border border-zinc-700 backdrop-blur-xs line-through">
                  Продано
                </span>
              )}
            </div>
          </a>

          <button
            type="button"
            data-active={isWishlisted}
            aria-pressed={isWishlisted}
            aria-label={
              isWishlisted
                ? `Убрать «${displayTitle}» из избранного`
                : `Добавить «${displayTitle}» в избранное`
            }
            onClick={() => toggleWishlist(product)}
            className="vintage-wishlist-btn absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-[#09090B]/85 border border-zinc-700/80 text-zinc-200 cursor-pointer hover:border-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-[#FF2E93] text-[#FF2E93]' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Content & Actions */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <a
            href={`#/product/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              onSelect(product.id);
            }}
            className="block space-y-1.5 focus-visible:outline-2 focus-visible:outline-[#A3E635]"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{CATEGORY_LABELS[product.category]}</span>
              {product.era && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.era}</span>
                </>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug group-hover:text-white transition-colors line-clamp-2">
              {displayTitle}
            </h3>
          </a>

          <div className="space-y-3 pt-3 border-t border-zinc-800/70">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-[#A3E635]">
                {formatPriceBYN(product.price)}
              </span>
              <span className="font-mono text-xs text-zinc-400 truncate">
                {product.sizes.join(' / ')}{product.category === 'shoes' && !product.sizes.join(' ').includes('EU') ? ' EU' : ''}
              </span>
            </div>

            {/* Direct Order Button via Telegram Nikita */}
            {product.inStock ? (
              <a
                href={orderTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[38px] px-3 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-lime-300 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>Заказать</span>
              </a>
            ) : (
              <a
                href={`${BRAND_INFO.supportUrl}?text=${encodeURIComponent(
                  `Привет! Интересует похожая вещь на эту (уже продана): ${displayTitle} (${product.price} BYN). Есть ли похожее в шоуруме?\nТовар: https://lavkazombie.vercel.app/#/product/${product.id}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[38px] px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono font-medium inline-flex items-center justify-center gap-1.5 uppercase transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Спросить наличие</span>
              </a>
            )}

            {/* Quick Fitting / Wishlist Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFitting(product)}
                className={`flex-1 min-h-[34px] px-2.5 py-1.5 text-xs font-medium inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  isFitting
                    ? 'bg-[#A3E635]/10 border-[#A3E635] text-[#A3E635]'
                    : 'bg-[#09090B] border-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <Ruler className="w-3 h-3 shrink-0" />
                <span>{isFitting ? 'В примерках' : 'Померить'}</span>
              </button>
            </div>

            {/* In-Catalog Admin Controls */}
            {isAdmin && (
              <div className="pt-2.5 mt-1 border-t border-dashed border-[#A3E635]/40 flex items-center gap-1.5 bg-[#A3E635]/5 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-2.5">
                <a
                  href={`#/admin?edit=${encodeURIComponent(product.id)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex-1 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#A3E635] text-white text-[11px] font-mono font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Открыть страницу настроек товара"
                >
                  <Edit3 className="w-3 h-3 text-[#A3E635]" />
                  <span>Настройки</span>
                </a>

                <button
                  type="button"
                  onClick={handleToggleStock}
                  title={product.inStock ? 'Нажмите, чтобы отметить ПРОДАНО' : 'Нажмите, чтобы вернуть В НАЛИЧИЕ'}
                  className={`py-1.5 px-2 border text-[11px] font-mono font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    product.inStock
                      ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/60'
                      : 'bg-lime-950/40 border-lime-800 text-lime-300 hover:bg-lime-900/60'
                  }`}
                >
                  {product.inStock ? '✕ Продано' : '✓ В наличие'}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  title="Удалить товар из каталога"
                  className="p-1.5 bg-red-950/30 hover:bg-red-900/60 border border-red-800/80 text-red-400 hover:text-red-200 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
};
