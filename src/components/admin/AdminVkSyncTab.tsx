import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Download, ExternalLink, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BRAND_INFO, type ProductCategory, type ProductSize } from '../../types/store';
import { parseVkItemDescription } from '../../utils/vkDescriptionParser';

interface AdminVkSyncTabProps {
  onOpenDrafts: () => void;
}

export const AdminVkSyncTab: React.FC<AdminVkSyncTabProps> = ({ onOpenDrafts }) => {
  const { user, importVkItems, importVkDrafts, showToast } = useStore();

  const [albumId, setAlbumId] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Direct paste JSON/data fallback
  const [showDirectPaste, setShowDirectPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultCount(null);

    const trimmed = albumId.trim();
    if (!trimmed) {
      setError('Вставьте ссылку на альбом ВК (например, https://vk.ru/album-139575762_241285866).');
      return;
    }

    setImporting(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/vk/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ albumId: trimmed }),
      });

      const rawText = await res.text();
      let data: {
        items?: Array<{
          title?: string;
          price?: number;
          size?: ProductSize;
          category?: ProductCategory;
          description?: string;
          image: string;
        }>;
        images?: string[];
        error?: string;
        needTokenNotice?: string;
      } = {};

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? 'Сервер вернул неожиданный ответ вместо данных альбома.'
            : `Сервер вернул ошибку (${res.status}).`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить данные из альбома.');
      }

      if (Array.isArray(data.items) && data.items.length > 0) {
        const savedCount = await importVkItems(data.items);
        setResultCount(savedCount);
        return;
      }

      const images = Array.isArray(data.images) ? data.images : [];
      if (images.length === 0) {
        if (data.needTokenNotice) {
          setError(data.needTokenNotice);
          setShowDirectPaste(true);
        } else {
          setError('В альбоме не найдено фотографий или альбом закрыт.');
        }
        return;
      }

      const savedCount = await importVkDrafts(images);
      setResultCount(savedCount);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      setError(rawMessage || 'Ошибка при импорте из ВК.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportPasted = async () => {
    setError(null);
    if (!pastedJson.trim()) return;

    try {
      const parsed = JSON.parse(pastedJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Данные должны быть массивом фотографий/товаров.');
      }

      const items = parsed.map((item: any) => {
        if (typeof item === 'string') {
          return {
            title: '',
            price: 0,
            size: 'ONE SIZE' as ProductSize,
            category: 'hoodies' as ProductCategory,
            image: item,
          };
        }
        const text = item.text || item.description || '';
        const parsedDesc = parseVkItemDescription(text);
        return {
          title: item.title || parsedDesc.title,
          price: item.price !== undefined ? Number(item.price) : parsedDesc.price,
          size: (item.size || parsedDesc.size) as ProductSize,
          category: (item.category || parsedDesc.category) as ProductCategory,
          description: text,
          image: item.image || item.url || '',
        };
      });

      const count = await importVkItems(items);
      setResultCount(count);
      setPastedJson('');
    } catch (e: any) {
      setError(`Ошибка разбора JSON: ${e?.message}`);
    }
  };

  const copyBrowserScript = () => {
    const script = `(() => {
  const items = [];
  const rows = document.querySelectorAll('[id^="photo_row_"]');
  rows.forEach(r => {
    const bg = r.style.backgroundImage || '';
    const match = bg.match(/url\\(["']?([^"']+)["']?\\)/);
    const imgUrl = match ? match[1].replace(/cs=\\d+x\\d+/, 'cs=1280x0') : '';
    const text = r.getAttribute('aria-label') || '';
    if (imgUrl) items.push({ image: imgUrl, description: text });
  });
  console.log(JSON.stringify(items));
  navigator.clipboard.writeText(JSON.stringify(items)).then(() => alert('Скопировано ' + items.length + ' товаров! Теперь вставьте их в админку на сайте.'));
})();`;
    navigator.clipboard.writeText(script);
    showToast('Скрипт скопирован! Вставьте его в консоль (F12) на вкладке альбома ВК');
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Main Import Form */}
      <form
        onSubmit={handleLoad}
        className="bg-[#111114] border border-zinc-800/80 p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#A3E635]/10 text-[#A3E635] text-xs font-mono font-medium rounded-sm">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Автоматический импорт</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white uppercase">
            Импорт альбома ВКонтакте
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Просто вставьте ссылку на открытый альбом вашей группы ({BRAND_INFO.vkOwnerId}).
            Названия (например, «Свитшот Ellesse»), цены в BYN и размеры автоматически распознаются и сохранятся в черновики.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="vk-album-input" className="block text-xs font-medium text-zinc-300">
            Ссылка на альбом ВК
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="vk-album-input"
              type="text"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              placeholder="https://vk.ru/album-139575762_241285866"
              className="flex-1 px-3.5 py-2.5 min-h-[44px] bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            <button
              type="submit"
              disabled={importing}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{importing ? 'Импортируем...' : 'Импортировать'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3.5 bg-red-950/40 border border-red-900 text-xs text-red-200">
            {error}
          </div>
        )}

        {resultCount !== null && (
          <div
            role="status"
            className="p-4 bg-lime-950/30 border border-lime-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-2.5 text-xs text-lime-200">
              <CheckCircle2 className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Успешно загружено {resultCount} товаров с фото, ценами и размерами в черновики!
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenDrafts}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold shrink-0 cursor-pointer hover:bg-lime-300"
            >
              <span>Посмотреть товары</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </form>

      {/* 1-Click Browser Sync Helper for Open Tabs */}
      <div className="bg-[#111114] border border-zinc-800/80 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Мгновенный импорт из соседней вкладки ВК
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Если альбом уже открыт у вас в браузере (на соседней вкладке), вы можете перенести все 260 товаров за 2 секунды без капч и ограничений.
            </p>
          </div>
          <button
            type="button"
            onClick={copyBrowserScript}
            className="neon-outline-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-zinc-700 text-zinc-200 hover:text-white shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Скопировать скрипт</span>
          </button>
        </div>

        <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal pl-4">
          <li>
            Откройте вкладку с альбомом ВК (например, <span className="text-zinc-200 font-mono">vk.ru/album-139575762_241285866</span>).
          </li>
          <li>
            Нажмите <strong>F12</strong> (или Ctrl+Shift+I) ➔ перейдите на вкладку <strong>Console</strong> (Консоль).
          </li>
          <li>
            Нажмите <strong>«Скопировать скрипт»</strong> выше, вставьте в консоль и нажмите <strong>Enter</strong>.
          </li>
          <li>
            Товары с ценами и фото автоматически скопируются в буфер. Затем нажмите кнопку ниже и вставьте их сюда:
          </li>
        </ol>

        <button
          type="button"
          onClick={() => setShowDirectPaste(!showDirectPaste)}
          className="text-xs text-[#A3E635] hover:underline cursor-pointer"
        >
          {showDirectPaste ? '▲ Скрыть окно вставки' : '▼ Вставить скопированные товары'}
        </button>

        {showDirectPaste && (
          <div className="pt-2 space-y-3">
            <textarea
              rows={4}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder="Вставьте сюда скопированный JSON с товарами..."
              className="w-full px-3 py-2 bg-[#09090B] border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            <button
              type="button"
              onClick={handleImportPasted}
              disabled={!pastedJson.trim()}
              className="px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold hover:bg-lime-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Сохранить товары в черновики
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
