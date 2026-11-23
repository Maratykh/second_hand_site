import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BRAND_INFO } from '../../types/store';

interface AdminVkSyncTabProps {
  onOpenDrafts: () => void;
}

export const AdminVkSyncTab: React.FC<AdminVkSyncTabProps> = ({ onOpenDrafts }) => {
  const { user, importVkDrafts } = useStore();

  const [albumId, setAlbumId] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultCount(null);

    const trimmed = albumId.trim();
    if (!trimmed) {
      setError('Введите ID альбома ВК или ссылку на публичный альбом.');
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
      let data: { images?: string[]; error?: string } = {};
      try {
        data = JSON.parse(rawText) as { images?: string[]; error?: string };
      } catch {
        throw new Error(
          res.ok
            ? 'Сервер вернул неожиданный ответ вместо списка фото.'
            : `Ошибка сервера (${res.status}). Проверьте, что вы вошли как администратор.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить фотографии альбома.');
      }

      const images = Array.isArray(data.images) ? data.images : [];
      if (images.length === 0) {
        setError('В открытом альбоме не найдено фотографий.');
        return;
      }

      const savedCount = await importVkDrafts(images);
      setResultCount(savedCount);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      if (rawMessage.startsWith('{')) {
        setError('Не удалось сохранить черновики в базу данных Firestore. Попробуйте перезайти в админ-панель.');
      } else {
        setError(rawMessage || 'Ошибка при загрузке альбома ВК.');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <form
        onSubmit={handleLoad}
        className="bg-[#111114] border border-zinc-800/80 p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-white uppercase">
            Импорт фото из альбома ВК
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Вставьте ID публичного альбома группы ({BRAND_INFO.vkOwnerId}) или полную ссылку на него (например, <span className="font-mono text-zinc-300">241285866</span> или <span className="font-mono text-zinc-300">https://vk.ru/album-139575762_241285866</span>). Загрузятся только фотографии и сохранятся как черновики с пустыми полями — затем вы сами впишете название, цену и опубликуете.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="vk-simple-album" className="block text-xs font-medium text-zinc-300">
            ID альбома ВК
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="vk-simple-album"
              type="text"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              placeholder="241285866 или https://vk.ru/album-139575762_241285866"
              className="flex-1 px-3.5 py-2.5 min-h-[44px] bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            <button
              type="submit"
              disabled={importing}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{importing ? 'Загружаем...' : 'Загрузить'}</span>
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
                Загружено {resultCount} фото в черновики. Откройте список и заполните названия и цены.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenDrafts}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A3E635] text-[#09090B] text-xs font-bold shrink-0 cursor-pointer hover:bg-lime-300"
            >
              <span>Открыть черновики</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
