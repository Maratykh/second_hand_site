import React, { useState } from 'react';
import { Menu, MessageCircle, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_INFO } from '../types/store';

export type AppRoute =
  | { page: 'home' }
  | { page: 'catalog'; category?: string; search?: string; inStock?: boolean }
  | { page: 'product'; productId: string }
  | { page: 'fittings'; tab?: 'fittings' | 'favorites' }
  | { page: 'about' }
  | { page: 'admin' };

interface HeaderProps {
  currentPage: AppRoute['page'];
  onNavigate: (route: AppRoute) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { fittingIds, isAdmin } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const navItems: Array<{ label: string; route: AppRoute; key: string }> = [
    { label: 'Главная', route: { page: 'home' }, key: 'home' },
    { label: 'Каталог', route: { page: 'catalog' }, key: 'catalog' },
    {
      label: 'В наличии',
      route: { page: 'catalog', inStock: true },
      key: 'inStock',
    },
    {
      label: fittingIds.length > 0 ? `Примерки (${fittingIds.length})` : 'Примерки',
      route: { page: 'fittings', tab: 'fittings' },
      key: 'fittings',
    },
    { label: 'Шоурум', route: { page: 'about' }, key: 'about' },
    {
      label: isAdmin ? '⚡ Наличие (Админ)' : 'Сотрудникам',
      route: { page: 'admin' },
      key: 'admin',
    },
  ];

  const handleLinkClick = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    onNavigate({ page: 'catalog', search: headerSearch.trim() });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
        {/* Brand Wordmark */}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick({ page: 'home' });
          }}
          className="font-display text-xl sm:text-2xl font-bold tracking-[0.06em] uppercase text-white hover:text-[#A3E635] transition-colors whitespace-nowrap shrink-0"
        >
          {BRAND_INFO.name}
        </a>

        {/* Quick Search Bar */}
        <form
          onSubmit={handleHeaderSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-xs relative"
        >
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Поиск вещи или бренда..."
            className="w-full bg-[#111114] border border-zinc-800 text-xs text-white placeholder:text-zinc-500 pl-9 pr-3 py-2 rounded-none focus:outline-none focus:border-[#A3E635] transition-colors"
          />
        </form>

        {/* Text Navigation Links */}
        <nav
          aria-label="Основная навигация"
          className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium"
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
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
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

        {/* Primary CTA: Order via Nikita in Telegram */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={BRAND_INFO.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="neon-btn inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] bg-[#A3E635] text-[#09090B] text-xs sm:text-sm font-bold hover:bg-lime-300 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4 shrink-0 fill-current" aria-hidden="true" />
            <span>Заказать {BRAND_INFO.supportHandle} 🛹</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 border border-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-[#0D0D10] px-4 py-4 space-y-4">
          <form onSubmit={handleHeaderSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Быстрый поиск вещей..."
              className="w-full bg-[#18181B] border border-zinc-700 text-sm text-white placeholder:text-zinc-500 pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#A3E635]"
            />
          </form>

          <nav aria-label="Мобильная навигация" className="flex flex-col gap-1">
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
                  className={`px-3 py-2.5 text-sm font-medium border-b border-zinc-800/60 last:border-b-0 ${
                    active ? 'text-[#A3E635]' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
