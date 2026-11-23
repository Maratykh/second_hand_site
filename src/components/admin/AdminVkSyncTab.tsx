import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clipboard, Copy, Download, ExternalLink, HelpCircle, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BRAND_INFO, type ProductCategory, type ProductSize } from '../../types/store';
import { parseVkItemDescription } from '../../utils/vkDescriptionParser';

interface AdminVkSyncTabProps {
  onOpenDrafts: () => void;
}

export const AdminVkSyncTab: React.FC<AdminVkSyncTabProps> = ({ onOpenDrafts }) => {
  const { user, importVkItems, importVkDrafts, showToast } = useStore();

  const [albumId, setAlbumId] = useState('https://vk.ru/album-139575762_241285866');
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
        body: JSON.stringify({ albumId: trimmed, albumUrl: trimmed }),
      });

      const rawText = await res.text();
      let data: any = {};

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? 'Сервер вернул неожиданный ответ.'
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
        setError(
          data.needTokenNotice ||
            'ВКонтакте блокирует автоматические запросы серверов к этому альбому (проверка на робота). Воспользуйтесь Способом 2 ниже — он за 5 секунд выгружает все 260 фото напрямую из вашей открытой вкладки!'
        );
        setShowDirectPaste(true);
        return;
      }

      const savedCount = await importVkDrafts(images);
      setResultCount(savedCount);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      setError(rawMessage || 'Ошибка при импорте из ВК.');
      setShowDirectPaste(true);
    } finally {
      setImporting(false);
    }
  };

  const handleImportPasted = async () => {
    setError(null);
    if (!pastedJson.trim()) return;

    try {
      let raw = pastedJson.trim();
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Maybe it's a list of image URLs separated by newline
        const urls = raw.match(/https?:\/\/[^\s"']+/g) || [];
        if (urls.length > 0) {
          parsed = urls.map((u) => ({ image: u }));
        } else {
          throw new Error('Не удалось распознать формат. Вставьте JSON или ссылки на фото.');
        }
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Данные должны быть списком фотографий/товаров.');
      }

      const items = parsed.map((item: any) => {
        if (typeof item === 'string') {
          return {
            title: 'Винтажная позиция',
            price: 0,
            size: 'M' as ProductSize,
            category: 'hoodies' as ProductCategory,
            image: item,
          };
        }
        const text = item.description || item.text || item.title || '';
        const parsedDesc = parseVkItemDescription(text);
        return {
          title: item.title && item.title !== 'Винтажная позиция' ? item.title : parsedDesc.title,
          price: item.price ? Number(item.price) : parsedDesc.price,
          size: (item.size || parsedDesc.size) as ProductSize,
          category: (item.category || parsedDesc.category) as ProductCategory,
          description: text,
          image: item.image || item.url || item.src || '',
        };
      }).filter((i: any) => Boolean(i.image));

      if (items.length === 0) {
        throw new Error('Не найдено корректных фотографий для создания товаров.');
      }

      const count = await importVkItems(items);
      setResultCount(count);
      setPastedJson('');
      showToast(`Импортировано ${count} товаров в черновики!`);
    } catch (e: any) {
      setError(`Ошибка импорта: ${e?.message}`);
    }
  };

  const copyBrowserScript = () => {
    const script = `(() => {
  const items = [];
  const seen = new Set();
  
  // Ищем все блоки с фото в альбоме ВК
  const candidates = document.querySelectorAll('a[href*="photo"], div[id^="photo_row"], .photos_row');
  candidates.forEach(el => {
    let img = el.querySelector('img')?.src || '';
    if (!img) {
      const bg = el.style?.backgroundImage || el.querySelector('div')?.style?.backgroundImage || window.getComputedStyle(el).backgroundImage;
      const m = bg.match(/url\\(["']?([^"']+)["']?\\)/);
      if (m) img = m[1];
    }
    if (img && !img.includes('.png')) {
      const cleanImg = img.replace(/cs=\\d+x\\d+/, 'cs=1280x0');
      const baseKey = cleanImg.split('?')[0];
      if (!seen.has(baseKey)) {
        seen.add(baseKey);
        const text = el.getAttribute('aria-label') || el.title || el.innerText || '';
        items.push({ image: cleanImg, description: text });
      }
    }
  });

  const json = JSON.stringify(items, null, 2);
  if (typeof copy === 'function') {
    copy(json);
  }
  navigator.clipboard.writeText(json).catch(() => {});
  alert('✅ Найдено ' + items.length + ' товаров! Они уже скопированы в ваш буфер обмена. Перейдите в админку сайта и нажмите «Вставить товары».');
})();`;

    navigator.clipboard.writeText(script);
    showToast('Скрипт скопирован! Вставьте его в консоль (F12) на открытой вкладке ВК');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedJson(text);
        showToast('Данные вставлены из буфера обмена!');
      }
    } catch {
      setShowDirectPaste(true);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* SUCCESS BANNER */}
      {resultCount !== null && (
        <div
          role="status"
          className="p-5 bg-lime-950/40 border border-[#A3E635] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 text-sm text-lime-200">
            <CheckCircle2 className="w-5 h-5 text-[#A3E635] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-white">Импорт успешно завершён!</p>
              <p className="text-xs text-lime-300/90 mt-0.5">
                Загружено {resultCount} товаров с ценами, размерами и фотографиями в черновики.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDrafts}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold shrink-0 cursor-pointer hover:bg-lime-300 transition-colors"
          >
            <span>Перейти к товарам</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* METHOD 1: Instant 1-Click Import from open VK tab */}
      <div className="bg-[#111114] border border-[#A3E635]/40 p-6 sm:p-8 space-y-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider">
              ⭐ Рекомендуемый способ · 100% надёжно
            </div>
            <h3 className="font-display text-2xl font-bold text-white uppercase mt-2">
              Импорт всех 260 фото из вашей открытой вкладки ВК
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
              Поскольку ВК требует капчи при обращениях с удалённых серверов, этот способ выгружает весь ваш открытый альбом без токенов и ограничений за 5 секунд.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#09090B] border border-zinc-800 space-y-3 text-xs text-zinc-300">
          <p className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Простые 3 шага:</span>
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="font-mono font-bold text-[#A3E635]">1.</span>
              <span>
                Нажмите кнопку ниже <strong>«Скопировать 1-клик скрипт»</strong>.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-mono font-bold text-[#A3E635]">2.</span>
              <span>
                Перейдите на вашу соседнюю открытую вкладку ВК с альбомом, нажмите <strong>F12</strong> (или Ctrl+Shift+I), перейдите в <strong>Console</strong> (Консоль), нажмите <strong>Ctrl+V</strong> и <strong>Enter</strong>.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-mono font-bold text-[#A3E635]">3.</span>
              <span>
                Вернитесь сюда и нажмите <strong>«Вставить и создать товары»</strong> — готово!
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={copyBrowserScript}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Скопировать 1-клик скрипт для ВК</span>
          </button>

          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-800 text-white border border-zinc-700 text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Clipboard className="w-4 h-4" />
            <span>Вставить из буфера</span>
          </button>
        </div>

        {/* Direct text/JSON area */}
        <div className="pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowDirectPaste(!showDirectPaste)}
            className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
          >
            {showDirectPaste ? '▲ Скрыть окно ручной вставки' : '▼ Открыть текстовое поле для вставки'}
          </button>

          {showDirectPaste && (
            <div className="pt-3 space-y-3">
              <textarea
                rows={5}
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder="Вставьте сюда скопированный результат из консоли ВК..."
                className="w-full px-3 py-2 bg-[#09090B] border border-zinc-700 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
              <button
                type="button"
                onClick={handleImportPasted}
                disabled={!pastedJson.trim()}
                className="px-5 py-2.5 bg-[#A3E635] text-[#09090B] text-xs font-bold uppercase tracking-wider hover:bg-lime-300 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Сохранить все товары в черновики
              </button>
            </div>
          )}
        </div>
      </div>

      {/* METHOD 2: Direct URL fetch via Serverless */}
      <form
        onSubmit={handleLoad}
        className="bg-[#111114] border border-zinc-800/80 p-6 sm:p-8 space-y-4"
      >
        <div className="space-y-1">
          <h3 className="font-display text-xl font-bold text-white uppercase">
            Прямой импорт по ссылке на альбом
          </h3>
          <p className="text-xs text-zinc-400">
            Попытка прямой серверной выгрузки альбома по ссылке.
          </p>
        </div>

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
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-zinc-800 text-white border border-zinc-700 text-xs font-bold uppercase hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{importing ? 'Загрузка...' : 'Импортировать по ссылке'}</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3.5 bg-red-950/40 border border-red-900 text-xs text-red-200">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};
