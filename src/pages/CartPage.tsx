import React from 'react';
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO, CATEGORY_LABELS } from '../types/store';
import { formatPriceBYN } from '../utils/storeLogic';
import { SafeImage } from '../components/SafeImage';
import type { AppRoute } from '../components/Header';

interface CartPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { cart, cartSummary, updateCartQty, removeFromCart, clearCart } = useStore();

  if (cart.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-lg mx-auto bg-[#111114] border border-zinc-800/80 p-10 text-center space-y-5">
          <h1 className="font-display text-3xl font-bold text-white uppercase">Корзина пуста</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Добавьте понравившиеся винтажные вещи из каталога. Большинство позиций представлены в 1–2 экземплярах.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'catalog' })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors cursor-pointer"
          >
            <span>Перейти в каталог</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Ваш выбор</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-1">
            Корзина
          </h1>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
        >
          Очистить корзину
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 divide-y divide-zinc-800/80 border border-zinc-800/80 bg-[#111114]">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.size}`}
              className="p-4 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
            >
              <a
                href={`#/product/${item.productId}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate({ page: 'product', productId: item.productId });
                }}
                className="w-24 h-32 shrink-0 bg-[#141417] border border-zinc-800 overflow-hidden"
              >
                <SafeImage
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </a>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="text-xs text-zinc-500">
                  <span>{CATEGORY_LABELS[item.category]}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-300">Размер {item.size}</span>
                </div>
                <a
                  href={`#/product/${item.productId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'product', productId: item.productId });
                  }}
                  className="block text-base font-semibold text-zinc-100 hover:text-white transition-colors"
                >
                  {item.title}
                </a>
                <p className="font-mono tabular-nums text-sm text-[#A3E635]">
                  {formatPriceBYN(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="inline-flex items-center border border-zinc-700 bg-[#09090B]">
                  <button
                    type="button"
                    aria-label={`Уменьшить количество «${item.title}» (${item.size})`}
                    onClick={() => updateCartQty(item.productId, item.size, -1)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center font-mono text-sm tabular-nums text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Увеличить количество «${item.title}» (${item.size})`}
                    onClick={() => updateCartQty(item.productId, item.size, 1)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  aria-label={`Удалить «${item.title}» (${item.size}) из корзины`}
                  onClick={() => removeFromCart(item.productId, item.size)}
                  className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <aside className="lg:col-span-4 bg-[#111114] border border-zinc-800/80 p-6 sm:p-7 space-y-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold text-white uppercase">Итого</h2>

          <div className="space-y-3 text-sm border-y border-zinc-800/80 py-5">
            <div className="flex justify-between text-zinc-400">
              <span>Товаров</span>
              <span className="font-mono tabular-nums text-zinc-100">
                {cartSummary.totalItems} шт.
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Доставка</span>
              <span className="text-zinc-200">По тарифам службы</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-zinc-800/60">
              <span className="text-white">К оплате</span>
              <span className="font-mono tabular-nums text-[#A3E635]" data-testid="cart-total">
                {formatPriceBYN(cartSummary.totalAmount)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate({ page: 'checkout' })}
            className="w-full py-3.5 px-6 bg-[#A3E635] text-[#09090B] text-sm font-bold uppercase tracking-wider hover:bg-lime-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Оформить заказ</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <p className="text-xs text-zinc-500 leading-relaxed">
            {BRAND_INFO.deliverySummary} Оплата согласовывается с менеджером после подтверждения заказа — онлайн-эквайринг на сайте не требуется.
          </p>
        </aside>
      </div>
    </div>
  );
};
