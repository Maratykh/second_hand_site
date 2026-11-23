import React from 'react';
import { BRAND_INFO } from '../types/store';
import type { AppRoute } from './Header';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#0B0B0E] mt-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-3">
            <p className="font-display text-xl font-bold tracking-[0.06em] uppercase text-white">
              {BRAND_INFO.name}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              {BRAND_INFO.tagline}
            </p>
            <p className="text-xs text-zinc-500 pt-1">
              {BRAND_INFO.deliverySummary}
            </p>
          </div>

          {/* Physical Address & Working Hours */}
          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold tracking-[0.08em] uppercase text-zinc-200">
              Шоурум в Минске
            </h2>
            <address className="not-italic text-sm text-zinc-400 space-y-2 leading-relaxed">
              <p className="text-zinc-200">{BRAND_INFO.address}</p>
              <p>{BRAND_INFO.hoursWeekdays}</p>
              <p>{BRAND_INFO.hoursWeekend}</p>
            </address>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold tracking-[0.08em] uppercase text-zinc-200">
              Разделы
            </h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a
                  href="#/catalog"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'catalog' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Каталог винтажа
                </a>
              </li>
              <li>
                <a
                  href="#/fittings"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'fittings', tab: 'fittings' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Мои примерки
                </a>
              </li>
              <li>
                <a
                  href="#/favorites"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'fittings', tab: 'favorites' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Избранное
                </a>
              </li>
              <li>
                <a
                  href="#/about"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'about' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  О магазине и доставка
                </a>
              </li>
              <li>
                <a
                  href="#/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'admin' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Панель администратора
                </a>
              </li>
            </ul>
          </div>

          {/* Socials & Support */}
          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold tracking-[0.08em] uppercase text-zinc-200">
              Соцсети и поддержка
            </h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a
                  href={BRAND_INFO.socials.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#A3E635] transition-colors"
                >
                  Telegram-канал: t.me/lavkazombie
                </a>
              </li>
              <li>
                <a
                  href={BRAND_INFO.socials.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#A3E635] transition-colors"
                >
                  VK Альбомы: vk.com/albums-139575762
                </a>
              </li>
              <li>
                <a
                  href={BRAND_INFO.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#A3E635] transition-colors"
                >
                  Instagram: @lavkazombie
                </a>
              </li>
              <li>
                <a
                  href={BRAND_INFO.socials.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#A3E635] transition-colors"
                >
                  TikTok: {BRAND_INFO.socials.tiktok}
                </a>
              </li>
              <li className="pt-1 text-zinc-300">
                Поддержка:{' '}
                <a
                  href={BRAND_INFO.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-zinc-600 hover:text-[#A3E635] hover:decoration-[#A3E635] transition-colors"
                >
                  {BRAND_INFO.supportHandle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <p>
            © {new Date().getFullYear()} {BRAND_INFO.name} ({BRAND_INFO.latinName}). Все права защищены.
          </p>
          <p>{BRAND_INFO.address}</p>
        </div>
      </div>
    </footer>
  );
};
