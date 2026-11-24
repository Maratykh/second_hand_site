import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { ProductCategory, ProductSize, ProductStatus } from '../../types/store';
import { CLOTHING_SIZES, PRODUCT_CATEGORIES, SCHEMA_LIMITS, SHOE_SIZES } from '../../types/store';
import { downloadProductPhoto } from '../../utils/downloadImage';
import { sanitizeImageUrl, sanitizeMeasurements, validateProductFormData } from '../../utils/storeLogic';
import type { AppRoute } from '../Header';

interface AdminProductEditPageProps {
  productId?: string;
  onNavigate?: (route: AppRoute) => void;
  onBack?: () => void;
}

export const AdminProductEditPage: React.FC<AdminProductEditPageProps> = ({
  productId,
  onNavigate,
  onBack,
}) => {
  const { adminProducts, productsLoading, saveProduct, uploadProductImage, deleteProduct, showToast } =
    useStore();

  const isNew = !productId || productId === 'new';
  const existingProduct = isNew ? null : adminProducts.find((p) => p.id === productId);

  const [hydratedId, setHydratedId] = useState<string | null>(existingProduct?.id || (isNew ? 'new' : null));
  const [title, setTitle] = useState(existingProduct?.title || '');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [price, setPrice] = useState(
    existingProduct ? (existingProduct.price > 0 ? String(existingProduct.price) : '') : '95'
  );
  const [category, setCategory] = useState<ProductCategory>(existingProduct?.category || 'jackets');
  const [sizes, setSizes] = useState<ProductSize[]>(existingProduct?.sizes || ['L']);
  const [era, setEra] = useState(existingProduct?.era ?? 'Винтаж / Y2K');
  const [condition, setCondition] = useState(
    existingProduct?.condition ?? '9/10 — Отличное винтажное'
  );
  const [measureLength, setMeasureLength] = useState(existingProduct?.measurements?.length || '');
  const [measureWidth, setMeasureWidth] = useState(existingProduct?.measurements?.width || '');
  const [measureSleeve, setMeasureSleeve] = useState(existingProduct?.measurements?.sleeve || '');

  const [status, setStatus] = useState<ProductStatus>(existingProduct?.status || 'published');
  const [inStock, setInStock] = useState(existingProduct?.inStock ?? true);
  const [featured, setFeatured] = useState(existingProduct?.featured ?? false);
  const [imagesText, setImagesText] = useState((existingProduct?.images || []).join('\n'));

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setHydratedId('new');
      return;
    }
    if (existingProduct && hydratedId !== existingProduct.id) {
      setTitle(existingProduct.title || '');
      setDescription(existingProduct.description || '');
      setPrice(existingProduct.price > 0 ? String(existingProduct.price) : '');
      setCategory(existingProduct.category || 'jackets');
      setSizes(existingProduct.sizes || ['L']);
      setEra(existingProduct.era ?? '');
      setCondition(existingProduct.condition ?? '');
      setMeasureLength(existingProduct.measurements?.length || '');
      setMeasureWidth(existingProduct.measurements?.width || '');
      setMeasureSleeve(existingProduct.measurements?.sleeve || '');
      setStatus(existingProduct.status || 'published');
      setInStock(existingProduct.inStock ?? true);
      setFeatured(existingProduct.featured ?? false);
      setImagesText((existingProduct.images || []).join('\n'));
      setHydratedId(existingProduct.id);
    }
  }, [isNew, existingProduct, hydratedId]);

  const toggleSize = (size: ProductSize) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleCategoryChange = (nextCategory: ProductCategory) => {
    setCategory(nextCategory);
    if (isNew) {
      if (nextCategory === 'shoes' && sizes.every((s) => CLOTHING_SIZES.includes(s))) {
        setSizes(['42']);
      } else if (nextCategory !== 'shoes' && sizes.every((s) => SHOE_SIZES.includes(s))) {
        setSizes(['L']);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const url = await uploadProductImage(file);
      if (url) {
        setImagesText((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));
        showToast('Фото обработано и добавлено');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить выбранное фото.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const parsedPreviewImages = imagesText
    .split('\n')
    .map((line) => sanitizeImageUrl(line))
    .filter((u): u is string => Boolean(u));

  const handleRemovePhoto = (idxToRemove: number) => {
    const nextImages = parsedPreviewImages.filter((_, idx) => idx !== idxToRemove);
    setImagesText(nextImages.join('\n'));
  };

  const handleDownloadPhotos = async () => {
    if (parsedPreviewImages.length === 0) return;
    setDownloading(true);
    try {
      await downloadProductPhoto(parsedPreviewImages[0], title || 'lavka-zombie-photo', 0);
      showToast('Фото сохранено');
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async (targetStatus?: ProductStatus) => {
    setError(null);
    setSavedSuccess(false);

    const parsedPrice = price.trim() === '' ? 0 : Number(price);
    const parsedImages = parsedPreviewImages;

    const validation = validateProductFormData({
      title,
      price: parsedPrice,
      images: parsedImages,
      sizes,
      status: targetStatus || status,
    });

    if (!validation.valid) {
      setError(validation.error || 'Ошибка валидации данных');
      return;
    }

    const measurements = sanitizeMeasurements({
      length: measureLength,
      width: measureWidth,
      sleeve: measureSleeve,
    });

    setSaving(true);
    try {
      await saveProduct(
        {
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          currency: 'BYN',
          category,
          sizes,
          images: parsedImages,
          era: era.trim(),
          condition: condition.trim(),
          measurements,
          status: targetStatus || status,
          inStock,
          featured,
        },
        existingProduct?.id
      );

      setSavedSuccess(true);
      showToast('Изменения товара успешно сохранены!');

      // Return back after short confirmation
      setTimeout(() => {
        if (onBack) {
          onBack();
        } else if (onNavigate) {
          if (existingProduct) {
            onNavigate({ page: 'product', productId: existingProduct.id });
          } else {
            onNavigate({ page: 'catalog' });
          }
        } else {
          window.location.hash = '#/catalog';
        }
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения товара.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingProduct) return;
    if (window.confirm(`Вы уверены, что хотите безвозвратно удалить товар «${existingProduct.title}»?`)) {
      await deleteProduct(existingProduct.id);
      showToast('Товар удален из каталога');
      if (onBack) {
        onBack();
      } else if (onNavigate) {
        onNavigate({ page: 'catalog' });
      } else {
        window.location.hash = '#/catalog';
      }
    }
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate({ page: 'catalog' });
    } else {
      window.location.hash = '#/catalog';
    }
  };

  if (!isNew && productsLoading && !existingProduct) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="h-8 w-48 bg-zinc-900 border border-zinc-800 animate-pulse" />
        <div className="h-64 bg-[#111114] border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (!isNew && !productsLoading && !existingProduct) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-5">
        <h1 className="font-display text-3xl text-white uppercase">Товар не найден</h1>
        <p className="text-sm text-zinc-400">
          Позиция с ID «{productId}» не найдена или была удалена.
        </p>
        <button
          type="button"
          onClick={handleGoBack}
          className="px-6 py-3 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-lime-300"
        >
          Вернуться в панель
        </button>
      </div>
    );
  }

  const baseSizeOptions = category === 'shoes' ? SHOE_SIZES : CLOTHING_SIZES;
  const availableSizeOptions = Array.from(new Set([...baseSizeOptions, ...sizes]));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-[#A3E635] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{onBack ? 'Назад в панель' : 'Назад в каталог'}</span>
          </button>

          {onBack && (
            <button
              type="button"
              onClick={() => onNavigate?.({ page: 'catalog' })}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-200 underline cursor-pointer"
            >
              Перейти в каталог
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {existingProduct && (
            <a
              href={`#/product/${existingProduct.id}`}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Посмотреть на сайте</span>
            </a>
          )}
          <span
            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase ${
              inStock
                ? 'bg-lime-950/60 border border-lime-800 text-lime-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {inStock ? '● В наличии' : '○ Продано'}
          </span>
        </div>
      </div>

      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase tracking-tight">
          {isNew ? 'Добавление нового товара' : `Настройки: ${existingProduct?.title || 'Товар'}`}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-mono">
          {isNew
            ? 'Заполните параметры и опубликуйте вещь в каталоге'
            : `ID товара: ${existingProduct?.id} · Изменения сразу отобразятся на витрине`}
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-950/70 border border-red-800 text-xs sm:text-sm text-red-200 leading-relaxed font-mono">
          Ошибка: {error}
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 bg-lime-950/70 border border-lime-700 text-xs sm:text-sm text-lime-200 leading-relaxed font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-[#A3E635]" />
          <span>Товар успешно сохранен! Перенаправление...</span>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* Section 1: Main Info */}
        <div className="bg-[#111114] border border-zinc-800 p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-mono font-bold text-[#A3E635] uppercase tracking-wider">
            1. Основная информация
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="prod-title" className="block text-xs font-medium text-zinc-300 uppercase">
              Название товара *
            </label>
            <input
              id="prod-title"
              type="text"
              maxLength={SCHEMA_LIMITS.productTitleMax}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вельветовая сумка Carhartt Pouch"
              className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prod-price" className="block text-xs font-medium text-zinc-300 uppercase">
                Цена (BYN) *
              </label>
              <input
                id="prod-price"
                type="number"
                min={0}
                max={SCHEMA_LIMITS.productPriceMax}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="45"
                className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-category" className="block text-xs font-medium text-zinc-300 uppercase">
                Категория *
              </label>
              <select
                id="prod-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-status" className="block text-xs font-medium text-zinc-300 uppercase">
                Статус публикации
              </label>
              <select
                id="prod-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              >
                <option value="published">Опубликован (виден на сайте)</option>
                <option value="draft">Черновик (скрыт)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-3 border-t border-zinc-800/80">
            <label className="inline-flex items-center gap-2.5 text-xs font-mono text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="accent-[#A3E635] w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold">Товар в наличии (активна кнопка заказа)</span>
            </label>

            <label className="inline-flex items-center gap-2.5 text-xs font-mono text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#A3E635] w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold">Выводить в блок «Свежий дроп» на главной</span>
            </label>
          </div>
        </div>

        {/* Section 2: Sizes, Era & Condition */}
        <div className="bg-[#111114] border border-zinc-800 p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-mono font-bold text-[#A3E635] uppercase tracking-wider">
            2. Размеры и состояние
          </h2>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-300 uppercase">
              Доступные размеры * (нажмите для выбора одного или нескольких)
            </span>
            <div className="flex flex-wrap gap-2">
              {availableSizeOptions.map((s) => {
                const active = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`min-w-[50px] h-10 px-3 font-mono text-xs cursor-pointer transition-colors border ${
                      active
                        ? 'bg-[#A3E635] text-[#09090B] font-bold border-[#A3E635]'
                        : 'bg-[#09090B] text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="prod-era" className="block text-xs font-medium text-zinc-300 uppercase">
                Эпоха / Стиль
              </label>
              <input
                id="prod-era"
                type="text"
                maxLength={SCHEMA_LIMITS.productEraMax}
                value={era}
                onChange={(e) => setEra(e.target.value)}
                placeholder="Винтаж / Y2K"
                className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-condition" className="block text-xs font-medium text-zinc-300 uppercase">
                Состояние вещи
              </label>
              <input
                id="prod-condition"
                type="text"
                maxLength={SCHEMA_LIMITS.productConditionMax}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="9/10 — Отличное селективное"
                className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Measurements */}
        <div className="bg-[#111114] border border-zinc-800 p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs font-mono font-bold text-[#A3E635] uppercase tracking-wider">
              3. Замеры изделия (см)
            </h2>
            <p className="text-xs text-zinc-400">
              Отображаются в удобной таблице на карточке товара
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prod-m-length" className="block text-xs font-mono text-zinc-400">
                Длина
              </label>
              <input
                id="prod-m-length"
                type="text"
                maxLength={SCHEMA_LIMITS.productMeasurementMax}
                value={measureLength}
                onChange={(e) => setMeasureLength(e.target.value)}
                placeholder="68 см"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-m-width" className="block text-xs font-mono text-zinc-400">
                Ширина / Полуобхват
              </label>
              <input
                id="prod-m-width"
                type="text"
                maxLength={SCHEMA_LIMITS.productMeasurementMax}
                value={measureWidth}
                onChange={(e) => setMeasureWidth(e.target.value)}
                placeholder="56 см"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-m-sleeve" className="block text-xs font-mono text-zinc-400">
                Рукав / Низ штанины
              </label>
              <input
                id="prod-m-sleeve"
                type="text"
                maxLength={SCHEMA_LIMITS.productMeasurementMax}
                value={measureSleeve}
                onChange={(e) => setMeasureSleeve(e.target.value)}
                placeholder="64 см"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Description */}
        <div className="bg-[#111114] border border-zinc-800 p-5 sm:p-6 space-y-3">
          <h2 className="text-xs font-mono font-bold text-[#A3E635] uppercase tracking-wider">
            4. Описание товара
          </h2>
          <textarea
            id="prod-desc"
            rows={4}
            maxLength={SCHEMA_LIMITS.productDescMax}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Оригинальный винтаж, плотный вельвет, вышитый патч с логотипом..."
            className="w-full px-4 py-3 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
          />
        </div>

        {/* Section 5: Photos & Gallery */}
        <div className="bg-[#111114] border border-zinc-800 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-mono font-bold text-[#A3E635] uppercase tracking-wider">
                5. Фотографии товара
              </h2>
              <p className="text-xs text-zinc-400">
                Загрузите фото с телефона/ПК или вставьте ссылки
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {parsedPreviewImages.length > 0 && (
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownloadPhotos}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Скачиваем...' : 'Скачать фото'}</span>
                </button>
              )}

              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase hover:bg-lime-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Загрузка...' : 'Загрузить фото'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Photo Previews Grid */}
          {parsedPreviewImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {parsedPreviewImages.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  className="group relative aspect-3/4 bg-zinc-950 border border-zinc-800 overflow-hidden"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#A3E635] text-[#09090B] text-[9px] font-mono font-bold uppercase">
                      Главное
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Удалить фото"
                    className="absolute top-1 right-1 w-6 h-6 bg-black/80 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 pt-2">
            <label htmlFor="prod-images" className="block text-xs font-mono text-zinc-400">
              Ссылки на изображения (по одной ссылке на строку):
            </label>
            <textarea
              id="prod-images"
              rows={3}
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              placeholder="https://... или загрузите файл выше"
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#A3E635]"
            />
          </div>
        </div>

        {/* Section 6: Danger Zone (Delete) */}
        {existingProduct && (
          <div className="p-5 bg-red-950/20 border border-red-900/50 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-mono font-bold text-red-400 uppercase">
                Опасная зона
              </h3>
              <p className="text-xs text-zinc-400">
                Безвозвратное удаление товара из каталога и базы данных
              </p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-mono font-bold uppercase inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить товар из базы</span>
            </button>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="sticky bottom-4 z-30 p-4 bg-[#111114]/95 backdrop-blur border border-zinc-700 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-5 py-3 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono uppercase cursor-pointer transition-colors"
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => handleSave()}
            className="px-8 py-3 bg-[#A3E635] text-[#09090B] hover:bg-lime-300 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer transition-colors"
          >
            {saving ? (
              <span>Сохранение...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{existingProduct ? 'Сохранить изменения' : 'Опубликовать товар'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
