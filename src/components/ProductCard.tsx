import React from 'react';
import { Heart, Ruler } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { CATEGORY_LABELS } from '../types/store';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';
import { ScrollReveal } from './ScrollReveal';

interface ProductCardProps {
  product: Product;
  onSelect: (productId: string) => void;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, index = 0 }) => {
  const { fittingIds, toggleFitting, wishlistIds, toggleWishlist } = useStore();

  const isFitting = fittingIds.includes(product.id);
  const isWishlisted = wishlistIds.includes(product.id);
  const displayTitle = product.title.trim() || 'Винтажная позиция';
  const delayMs = Math.min((index % 4) * 65, 195);

  return (
    <ScrollReveal delayMs={delayMs} className="h-full">
      <article className="vintage-card group relative flex flex-col h-full">
        {/* Image + Quick Wishlist */}
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
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              fallbackLabel={displayTitle}
            />
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                <span className="font-display text-sm tracking-[0.12em] uppercase text-zinc-200 border border-zinc-500 px-3 py-1 bg-[#09090B]/90">
                  Продано
                </span>
              </div>
            )}
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
            className="vintage-wishlist-btn absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center bg-[#09090B]/80 border border-zinc-700/80 text-zinc-200 cursor-pointer"
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
            <h3 className="text-base font-semibold text-zinc-100 leading-snug group-hover:text-white transition-colors line-clamp-2">
              {displayTitle}
            </h3>
          </a>

          <div className="space-y-3 pt-3 border-t border-zinc-800/70">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono tabular-nums text-[15px] font-semibold text-[#A3E635]">
                {formatPriceBYN(product.price)}
              </span>
              <span className="font-mono text-xs text-zinc-400 truncate">
                {product.sizes.join(' / ')}
              </span>
            </div>

            <button
              type="button"
              aria-pressed={isFitting}
              aria-label={
                isFitting
                  ? `Убрать «${displayTitle}» из списка примерок`
                  : `Померить «${displayTitle}»`
              }
              onClick={() => toggleFitting(product)}
              className={`w-full min-h-[40px] px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-2 border transition-colors whitespace-nowrap cursor-pointer ${
                isFitting
                  ? 'bg-[#A3E635]/15 border-[#A3E635] text-[#A3E635]'
                  : 'bg-[#09090B] border-zinc-700 text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635]'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{isFitting ? 'В примерках' : 'Померить'}</span>
            </button>
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
};
