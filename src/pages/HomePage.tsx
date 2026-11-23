import React from 'react';
import { ArrowRight, ExternalLink, MessageCircle, PackageCheck, SearchCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HERO_BANNER_IMAGE } from '../data/seedProducts';
import { BRAND_INFO, PRODUCT_CATEGORIES } from '../types/store';
import type { AppRoute } from '../components/Header';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { ScrollReveal } from '../components/ScrollReveal';

interface HomePageProps {
  onNavigate: (route: AppRoute) => void;
}

const HOW_TO_ORDER_STEPS = [
  {
    number: '01.',
    title: 'Выбрать вещь',
    description:
      'Найдите нужную позицию в каталоге, изучите замеры или добавьте её в список «Хочу померить» перед визитом в шоурум.',
    icon: SearchCheck,
  },
  {
    number: '02.',
    title: 'Заказать у Никиты 🛹',
    description: `Нажмите «Заказать у Никиты» на странице нужного товара — откроется диалог в Telegram с ${BRAND_INFO.supportHandle} с готовым сообщением, ценой и ссылкой.`,
    icon: MessageCircle,
  },
  {
    number: '03.',
    title: 'Получить почтой',
    description:
      'Отправляем Европочтой и Белпочтой по всей Беларуси, СДЭКом в Россию, либо ждём вас на примерку в Минске.',
    icon: PackageCheck,
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { products, productsLoading, heroSettings } = useStore();

  const displayArrivals = React.useMemo(() => {
    if (heroSettings?.featuredProductIds && heroSettings.featuredProductIds.length > 0) {
      const idSet = new Set(heroSettings.featuredProductIds);
      const matched = products.filter((p) => idSet.has(p.id));
      if (matched.length > 0) return matched.slice(0, 4);
    }
    const newArrivals = products.filter((p) => p.featured).slice(0, 4);
    return newArrivals.length > 0 ? newArrivals : products.slice(0, 4);
  }, [products, heroSettings?.featuredProductIds]);

  const categoryCounts = PRODUCT_CATEGORIES.map((cat) => ({
    ...cat,
    count: products.filter((p) => p.category === cat.key && p.inStock).length,
  }));

  return (
    <div className="space-y-20">
      {/* Section 1: Storefront Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-[#09090B]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between py-2 space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-[0.14em] uppercase text-zinc-400">
                  {heroSettings?.badge || 'Минск · ул. Веры Хоружей 3, оф. 308'}
                </p>
                <h1 className="font-display text-[clamp(2.25rem,4vw,3.6rem)] font-bold leading-[1.12] tracking-tight text-white uppercase">
                  {heroSettings?.title || 'Селективный винтаж без лишней наценки'}
                </h1>
                <p className="text-base text-zinc-400 leading-relaxed max-w-md">
                  {heroSettings?.description ||
                    `${BRAND_INFO.tagline} Архивная кожа, тяжёлый хлопок 90-х и честный деним — в одном экземпляре.`}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'catalog' })}
                    className="neon-btn inline-flex items-center gap-2.5 px-6 py-3.5 min-h-[44px] bg-[#A3E635] text-[#09090B] text-sm font-bold tracking-wide hover:bg-lime-300 transition-colors cursor-pointer"
                  >
                    <span>Смотреть каталог</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <a
                    href={BRAND_INFO.socials.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neon-outline-btn px-5 py-3.5 min-h-[44px] inline-flex items-center border border-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
                  >
                    Анонсы дропов в Telegram
                  </a>
                </div>

                <div className="pt-5 border-t border-zinc-800/80 grid grid-cols-2 gap-4 text-xs text-zinc-400">
                  <div>
                    <p className="text-zinc-200 font-medium">Еженедельные дропы</p>
                    <p className="mt-0.5">Свежий винтаж и альбомы VK</p>
                  </div>
                  <div>
                    <p className="text-zinc-200 font-medium">Доставка РБ и РФ</p>
                    <p className="mt-0.5">Почта, Европочта и СДЭК</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[420px] bg-[#141417] border border-zinc-800/80 overflow-hidden">
              <SafeImage
                src={heroSettings?.bannerImage || HERO_BANNER_IMAGE}
                alt="Шоурум винтажной одежды Лавка Зомби в Минске"
                className="w-full h-full object-cover lg:absolute lg:inset-0"
                fallbackLabel="Лавка Зомби — Шоурум Минск"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090B]/85 via-transparent to-transparent"
              />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                <div className="text-xs sm:text-sm text-zinc-200">
                  <span className="font-semibold text-white">Шоурум открыт ежедневно</span>
                  <span className="mx-2 text-zinc-500" aria-hidden="true">·</span>
                  <span className="text-zinc-300">{BRAND_INFO.hoursWeekdays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: New Arrivals */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Свежее поступление</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mt-1">
              Новые поступления
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'catalog' })}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-[#A3E635] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Весь каталог ({products.length})</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-[#111114] border border-zinc-800 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayArrivals.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                onSelect={(id) => onNavigate({ page: 'product', productId: id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: How to Order (3 steps) & Reviews */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 border-t border-zinc-800/80 pt-14">
        {/* How to Order */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Простой процесс</p>
              <h2 className="font-display text-3xl font-bold text-white uppercase tracking-tight mt-1">
                Как заказать
              </h2>
            </div>
            <a
              href={BRAND_INFO.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#A3E635] hover:underline self-start sm:self-auto"
            >
              <span>Написать в Telegram ({BRAND_INFO.supportHandle})</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_TO_ORDER_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={step.number} delayMs={idx * 70} className="h-full">
                  <div className="vintage-panel p-6 sm:p-7 flex flex-col justify-between gap-5 h-full">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-[#A3E635] tabular-nums">
                        {step.number}
                      </span>
                      <Icon className="w-5 h-5 text-zinc-400" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl font-bold text-white uppercase">
                        {step.title}
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* Reviews Block */}
        <div className="vintage-panel p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">
              Проверенные покупки · РБ и РФ
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase">
              Отзывы покупателей
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Реальные фото посылок, отзывы о качестве вещей и чеки отправок Европочтой, Белпочтой и СДЭКом собраны в нашем альбоме ВКонтакте.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={BRAND_INFO.reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-btn inline-flex items-center gap-2 px-6 py-3.5 min-h-[44px] bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors whitespace-nowrap"
            >
              <span>Смотреть отзывы в VK</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href={BRAND_INFO.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-outline-btn inline-flex items-center gap-2 px-5 py-3.5 min-h-[44px] border border-zinc-700 text-zinc-200 text-sm font-medium whitespace-nowrap"
            >
              <span>Instagram @lavkazombie</span>
            </a>
          </div>
        </div>
      </section>

      {/* Section 4: Categories & Minsk Showroom */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-zinc-800/80 pt-14">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Навигация по архиву</p>
              <h2 className="font-display text-3xl font-bold text-white uppercase tracking-tight mt-1">
                Категории
              </h2>
            </div>

            <div className="divide-y divide-zinc-800/80 border-y border-zinc-800/80">
              {categoryCounts.map((cat, idx) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onNavigate({ page: 'catalog', category: cat.key })}
                  className="w-full py-4 px-2 flex items-center justify-between text-left group hover:bg-[#111114] transition-colors cursor-pointer"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-xs text-zinc-500 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="text-base sm:text-lg font-medium text-zinc-200 group-hover:text-white transition-colors">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-zinc-500 tabular-nums">
                      {cat.count} шт.
                    </span>
                    <ArrowRight
                      className="w-4 h-4 text-zinc-500 group-hover:text-[#A3E635] group-hover:translate-x-0.5 transition-all"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#111114] border border-zinc-800/80 p-7 sm:p-8 flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Офлайн-точка и отправка</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase">
                Заходите на примерку в Минске
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Каждую неделю разбираем новые поставки винтажа из Европы и США. Отмечайте понравившиеся вещи кнопкой «Померить» и приходите в шоурум.
              </p>
            </div>

            <div className="space-y-3 pt-5 border-t border-zinc-800/80 text-sm">
              <p className="text-zinc-100 font-medium">{BRAND_INFO.address}</p>
              <p className="text-zinc-400">
                {BRAND_INFO.hoursWeekdays} · {BRAND_INFO.hoursWeekend}
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs">
                <a
                  href={BRAND_INFO.socials.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline decoration-zinc-600 hover:text-[#A3E635] hover:decoration-[#A3E635]"
                >
                  Альбомы VK
                </a>
                <a
                  href={BRAND_INFO.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline decoration-zinc-600 hover:text-[#A3E635] hover:decoration-[#A3E635]"
                >
                  Instagram
                </a>
                <a
                  href={BRAND_INFO.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline decoration-zinc-600 hover:text-[#A3E635] hover:decoration-[#A3E635]"
                >
                  Вопросы: {BRAND_INFO.supportHandle}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
