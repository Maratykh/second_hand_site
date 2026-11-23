import React, { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO } from '../types/store';

export type AppRoute =
  | { page: 'home' }
  | { page: 'catalog'; category?: string }
  | { page: 'product'; productId: string }
  | { page: 'fittings'; tab?: 'fittings' | 'favorites' }
  | { page: 'cart' }
  | { page: 'checkout' }
  | { page: 'about' }
  | { page: 'admin' };

interface HeaderProps {
  currentPage: AppRoute['page'];
  onNavigate: (route: AppRoute) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { cartSummary, fittingIds, newOrdersCount, isAdmin } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ label: string; route: AppRoute; key: AppRoute['page'] }> = [
    { label: 'Главная', route: { page: 'home' }, key: 'home' },
    { label: 'Каталог', route: { page: 'catalog' }, key: 'catalog' },
    {
      label: fittingIds.length > 0 ? `Мои примерки (${fittingIds.length})` : 'Мои примерки',
      route: { page: 'fittings', tab: 'fittings' },
      key: 'fittings',
    },
    { label: 'О магазине', route: { page: 'about' }, key: 'about' },
    {
      label: isAdmin && newOrdersCount > 0 ? `Админ (${newOrdersCount})` : 'Админ',
      route: { page: 'admin' },
      key: 'admin',
    },
  ];

  const handleLinkClick = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick({ page: 'home' });
          }}
          className="font-display text-xl sm:text-2xl font-bold tracking-[0.06em] uppercase text-white hover:text-[#A3E635] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A3E635]"
        >
          {BRAND_INFO.name}
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const active = currentPage === item.key;
            return (
              <a
                key={item.key}
                href={`#/${item.key === 'home' ? '' : item.key}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.route);
                }}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A3E635] ${
                  active
                    ? 'text-white border-[#A3E635]'
                    : 'text-zinc-400 border-transparent hover:text-white hover:border-zinc-600'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action CTA (Cart) + Mobile Drawer Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLinkClick({ page: 'cart' })}
            aria-label={`Открыть корзину, товаров: ${cartSummary.totalItems}`}
            className="neon-btn inline-flex items-center gap-2 px-4 py-2 min-h-[40px] bg-[#A3E635] text-[#09090B] text-xs sm:text-sm font-semibold hover:bg-lime-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">Корзина ({cartSummary.totalItems})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Закрыть меню навигации' : 'Открыть меню навигации'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 border border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-600 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Мобильная навигация"
          className="md:hidden border-t border-zinc-800 bg-[#0D0D10] px-4 py-4 flex flex-col gap-1"
        >
          {navItems.map((item) => {
            const active = currentPage === item.key;
            return (
              <a
                key={item.key}
                href={`#/${item.key === 'home' ? '' : item.key}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.route);
                }}
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-3 text-base font-medium border-b border-zinc-800/60 last:border-b-0 ${
                  active ? 'text-[#A3E635]' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
};
