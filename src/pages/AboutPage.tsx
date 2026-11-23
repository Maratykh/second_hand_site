import React from 'react';
import { Clock, ExternalLink, MapPin, MessageCircle, Truck } from 'lucide-react';
import { BRAND_INFO, DELIVERY_METHODS } from '../types/store';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <section className="max-w-3xl space-y-4 border-b border-zinc-800/80 pb-8">
        <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">О проекте</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white uppercase tracking-tight">
          {BRAND_INFO.name} ({BRAND_INFO.latinName})
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
          {BRAND_INFO.tagline}
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Мы вручную отбираем аутентичную винтажную одежду 80-х, 90-х и Y2K: от тяжёлых кожаных косух и американского ворквера до редких графических футболок и денима. Каждую неделю выкладываем большой свежий дроп в нашем шоуруме в Минске, на сайте и в альбомах ВКонтакте.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111114] border border-zinc-800/80 p-6 space-y-3">
          <MapPin className="w-5 h-5 text-[#A3E635]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-white uppercase">Адрес шоурума</h2>
          <p className="text-sm text-zinc-200 leading-relaxed">{BRAND_INFO.address}</p>
          <p className="text-xs text-zinc-500">
            Удобный вход в центре Минска (район Комаровского рынка / пл. Якуба Коласа).
          </p>
        </div>

        <div className="bg-[#111114] border border-zinc-800/80 p-6 space-y-3">
          <Clock className="w-5 h-5 text-[#A3E635]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-white uppercase">Режим работы</h2>
          <div className="text-sm text-zinc-200 space-y-1">
            <p>{BRAND_INFO.hoursWeekdays}</p>
            <p>{BRAND_INFO.hoursWeekend}</p>
          </div>
          <p className="text-xs text-zinc-500">Работаем без выходных. Приходите на примерку.</p>
        </div>

        <div className="bg-[#111114] border border-zinc-800/80 p-6 space-y-3">
          <MessageCircle className="w-5 h-5 text-[#A3E635]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-white uppercase">Поддержка и замеры</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Нужны точные замеры, дополнительные фото или помощь с заказом? Напишите напрямую:
          </p>
          <a
            href={BRAND_INFO.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A3E635] hover:underline"
          >
            <span>{BRAND_INFO.supportHandle}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-zinc-800/80 pt-10">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-[#A3E635]" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-white uppercase">Доставка</h2>
          </div>
          <p className="text-sm text-zinc-400">{BRAND_INFO.deliverySummary}</p>
          <div className="divide-y divide-zinc-800/80 border border-zinc-800/80 bg-[#111114]">
            {DELIVERY_METHODS.map((m) => (
              <div key={m.key} className="p-4 sm:p-5">
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-zinc-400 mt-1">{m.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-2xl font-bold text-white uppercase">Наши площадки</h2>
          <div className="divide-y divide-zinc-800/80 border border-zinc-800/80 bg-[#111114]">
            <a
              href={BRAND_INFO.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-[#18181B] transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-white">Telegram</p>
                <p className="text-xs text-zinc-400">t.me/lavkazombie — анонсы дропов</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            </a>
            <a
              href={BRAND_INFO.socials.vk}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-[#18181B] transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-white">VK Альбомы</p>
                <p className="text-xs text-zinc-400">vk.com/albums-139575762 — наличие</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            </a>
            <a
              href={BRAND_INFO.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-[#18181B] transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-white">Instagram</p>
                <p className="text-xs text-zinc-400">@lavkazombie — луки и сторис</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            </a>
            <a
              href={BRAND_INFO.socials.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-[#18181B] transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-white">TikTok</p>
                <p className="text-xs text-zinc-400">{BRAND_INFO.socials.tiktok}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
