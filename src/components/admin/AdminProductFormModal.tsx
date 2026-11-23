import React, { useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Product, ProductCategory, ProductSize, ProductStatus } from '../../types/store';
import { ALL_SIZES, PRODUCT_CATEGORIES, SCHEMA_LIMITS } from '../../types/store';
import { downloadProductPhoto } from '../../utils/downloadImage';
import { sanitizeImageUrl, sanitizeMeasurements } from '../../utils/storeLogic';

interface AdminProductFormModalProps {
  initialProduct?: Product | null;
  onClose: () => void;
}

export const AdminProductFormModal: React.FC<AdminProductFormModalProps> = ({
  initialProduct,
  onClose,
}) => {
  const { saveProduct, uploadProductImage, showToast } = useStore();

  const isDraft = initialProduct?.status === 'draft';

  const [title, setTitle] = useState(initialProduct?.title || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [price, setPrice] = useState(
    initialProduct ? (initialProduct.price > 0 ? String(initialProduct.price) : '') : '95'
  );
  const [category, setCategory] = useState<ProductCategory>(initialProduct?.category || 'jackets');
  const [sizes, setSizes] = useState<ProductSize[]>(initialProduct?.sizes || ['L']);
  const [era, setEra] = useState(initialProduct?.era ?? (isDraft ? '' : '90-е'));
  const [condition, setCondition] = useState(
    initialProduct?.condition ?? (isDraft ? '' : '9/10 — Отличное винтажное')
  );
  const [measureLength, setMeasureLength] = useState(initialProduct?.measurements?.length || '');
  const [measureWidth, setMeasureWidth] = useState(initialProduct?.measurements?.width || '');
  const [measureSleeve, setMeasureSleeve] = useState(initialProduct?.measurements?.sleeve || '');

  const [status, setStatus] = useState<ProductStatus>(initialProduct?.status || 'published');
  const [inStock, setInStock] = useState(initialProduct?.inStock ?? true);
  const [featured, setFeatured] = useState(initialProduct?.featured ?? false);
  const [imagesText, setImagesText] = useState((initialProduct?.images || []).join('\n'));

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSize = (size: ProductSize) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setImagesText((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось загрузить файл в Firebase Storage. Вы также можете вставить URL изображения.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const parsedPreviewImages = imagesText
    .split('\n')
    .map((line) => sanitizeImageUrl(line))
    .filter((u): u is string => Boolean(u));

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

  const submitWithStatus = async (targetStatus: ProductStatus) => {
    setError(null);

    const parsedPrice = price.trim() === '' ? 0 : Number(price);
    const parsedImages = parsedPreviewImages;

    if (targetStatus === 'published' && title.trim().length < 2) {
      setError('Для публикации укажите название товара (минимум 2 символа).');
      return;
    }
    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 ||
      parsedPrice > SCHEMA_LIMITS.productPriceMax
    ) {
      setError('Укажите корректную цену в BYN.');
      return;
    }
    if (targetStatus === 'published' && parsedPrice <= 0) {
      setError('Для публикации на сайте укажите цену больше 0 BYN.');
      return;
    }
    if (sizes.length === 0) {
      setError('Выберите хотя бы один размер.');
      return;
    }
    if (parsedImages.length === 0) {
      setError('Добавьте хотя бы одно изображение (загрузите файл или укажите URL).');
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
          status: targetStatus,
          inStock,
          featured,
        },
        initialProduct?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения товара.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitWithStatus(status);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#111114] border border-zinc-700 p-5 sm:p-8 my-8 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-0.5">
            <h2
              id="product-modal-title"
              className="font-display text-2xl font-bold text-white uppercase"
            >
              {initialProduct ? 'Редактировать товар' : 'Новый товар'}
            </h2>
            {isDraft && (
              <p className="text-xs text-amber-400">
                Статус: Черновик — впишите название, цену и нажмите «Опубликовать на сайте»
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть форму товара"
            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="prod-title" className="block text-xs font-medium text-zinc-300">
              Название *
            </label>
            <input
              id="prod-title"
              type="text"
              maxLength={SCHEMA_LIMITS.productTitleMax}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Кожаная куртка Vintage 90s"
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prod-price" className="block text-xs font-medium text-zinc-300">
                Цена (BYN) *
              </label>
              <input
                id="prod-price"
                type="number"
                min={0}
                max={SCHEMA_LIMITS.productPriceMax}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-category" className="block text-xs font-medium text-zinc-300">
                Категория *
              </label>
              <select
                id="prod-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-status" className="block text-xs font-medium text-zinc-300">
                Статус публикации
              </label>
              <select
                id="prod-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              >
                <option value="draft">Черновик (скрыт)</option>
                <option value="published">Опубликован</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-300">Размеры *</span>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((s) => {
                const active = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`px-3 py-1.5 min-h-[36px] text-xs font-mono cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#A3E635] text-[#09090B] font-bold'
                        : 'bg-[#09090B] text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Era (plain text) & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prod-era" className="block text-xs font-medium text-zinc-300">
                Эпоха
              </label>
              <input
                id="prod-era"
                type="text"
                maxLength={SCHEMA_LIMITS.productEraMax}
                value={era}
                onChange={(e) => setEra(e.target.value)}
                placeholder="Например: 90-е или Y2K"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-condition" className="block text-xs font-medium text-zinc-300">
                Состояние
              </label>
              <input
                id="prod-condition"
                type="text"
                maxLength={SCHEMA_LIMITS.productConditionMax}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="9/10 — Отличное винтажное"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>

          {/* Measurements */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-300">
              Замеры изделия (отображаются таблицей на странице товара)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="prod-m-length" className="block text-xs text-zinc-400">
                  Длина
                </label>
                <input
                  id="prod-m-length"
                  type="text"
                  maxLength={SCHEMA_LIMITS.productMeasurementMax}
                  value={measureLength}
                  onChange={(e) => setMeasureLength(e.target.value)}
                  placeholder="Напр. 68 см"
                  className="w-full px-3 py-2 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="prod-m-width" className="block text-xs text-zinc-400">
                  Ширина
                </label>
                <input
                  id="prod-m-width"
                  type="text"
                  maxLength={SCHEMA_LIMITS.productMeasurementMax}
                  value={measureWidth}
                  onChange={(e) => setMeasureWidth(e.target.value)}
                  placeholder="Напр. 58 см"
                  className="w-full px-3 py-2 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="prod-m-sleeve" className="block text-xs text-zinc-400">
                  Рукав
                </label>
                <input
                  id="prod-m-sleeve"
                  type="text"
                  maxLength={SCHEMA_LIMITS.productMeasurementMax}
                  value={measureSleeve}
                  onChange={(e) => setMeasureSleeve(e.target.value)}
                  placeholder="Напр. 63 см"
                  className="w-full px-3 py-2 bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-desc" className="block text-xs font-medium text-zinc-300">
              Описание
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              maxLength={SCHEMA_LIMITS.productDescMax}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Детали кроя, материал, особенности..."
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="prod-images" className="block text-xs font-medium text-zinc-300">
                Фотографии (по одному URL на строку) *
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {parsedPreviewImages.length > 0 && (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={handleDownloadPhotos}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{downloading ? 'Скачиваем...' : 'Скачать фото товара'}</span>
                  </button>
                )}

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-[#A3E635] hover:text-[#A3E635] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{uploading ? 'Загрузка...' : 'Загрузить файл'}</span>
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
            <textarea
              id="prod-images"
              rows={3}
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              placeholder="https://... или загрузите файл выше"
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="accent-[#A3E635] w-4 h-4"
              />
              В наличии
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#A3E635] w-4 h-4"
              />
              Показывать в «Новых поступлениях»
            </label>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-zinc-700 text-zinc-300 text-sm hover:text-white cursor-pointer"
            >
              Отмена
            </button>

            {isDraft && (
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => void submitWithStatus('draft')}
                className="px-4 py-2.5 border border-zinc-600 text-zinc-200 text-sm hover:border-white cursor-pointer"
              >
                Сохранить как черновик
              </button>
            )}

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() =>
                void submitWithStatus(isDraft ? 'published' : status)
              }
              className="px-6 py-2.5 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? 'Сохраняем...'
                : isDraft
                  ? 'Опубликовать на сайте'
                  : initialProduct
                    ? 'Сохранить изменения'
                    : 'Добавить товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
