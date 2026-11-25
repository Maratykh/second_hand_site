import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractVkPhotosFromAlPhotosPayload,
  extractVkPublicAlbumPhotoUrls,
  isVkAlbumsListUrl,
  parseVkAlbumInput,
} from './src/utils/vkAlbumParser.ts';
import { fetchDecodedProductPhoto } from './api/_lib/firebaseRest.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const DEFAULT_VK_OWNER_ID = process.env.VK_OWNER_ID || '-139575762';
const ADMIN_EMAIL = 'gotdehgot@gmail.com';

function loadFirebaseApiKey(): string | null {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { apiKey?: string };
    return typeof raw.apiKey === 'string' && raw.apiKey.length > 10 ? raw.apiKey : null;
  } catch {
    return null;
  }
}

const FIREBASE_API_KEY = loadFirebaseApiKey();

interface AuthenticatedRequest extends Request {
  adminUser?: { uid: string; email: string };
}

async function verifyAdminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация администратора.' });
    return;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length > 4096 || !FIREBASE_API_KEY) {
    res.status(401).json({ error: 'Некорректный токен авторизации.' });
    return;
  }

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      res.status(401).json({ error: 'Сессия недействительна. Войдите снова.' });
      return;
    }

    const payload = (await lookupRes.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = payload.users?.[0];
    if (!user?.localId || !user.email || user.emailVerified !== true) {
      res.status(403).json({ error: 'Доступ разрешён только подтверждённым аккаунтам.' });
      return;
    }
    if (user.email.toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Недостаточно прав. Требуется аккаунт администратора.' });
      return;
    }

    req.adminUser = { uid: user.localId, email: user.email };
    next();
  } catch {
    res.status(500).json({ error: 'Не удалось проверить авторизацию.' });
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  const ipType = net.isIP(lower);
  if (ipType === 4) {
    const parts = lower.split('.').map(Number);
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    ) {
      return true;
    }
  }
  if (ipType === 6) {
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }
  }
  return false;
}

const VK_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchPublicVkAlbumHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': VK_BROWSER_UA,
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.5',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const ct = response.headers.get('content-type') || '';
    const charset = /windows-1251/i.test(ct) ? 'windows-1251' : 'utf-8';
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVkAlPhotosPage(
  host: 'vk.com' | 'vk.ru',
  ownerId: string,
  albumId: string,
  offset: number
): Promise<{ total: number; images: string[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://${host}/al_photos.php?act=show`, {
      method: 'POST',
      headers: {
        'User-Agent': VK_BROWSER_UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `https://${host}/album${ownerId}_${albumId}`,
        Origin: `https://${host}`,
      },
      body: `al=1&list=${encodeURIComponent(`album${ownerId}_${albumId}`)}&offset=${offset}`,
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const ct = response.headers.get('content-type') || '';
    const charset = /windows-1251/i.test(ct) ? 'windows-1251' : 'utf-8';
    const text = new TextDecoder(charset).decode(buffer);
    return extractVkPhotosFromAlPhotosPayload(text, 60);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicVkAlbumImages(
  ownerId: string,
  albumId: string,
  maxPhotos = 50
): Promise<{ images: string[]; total: number }> {
  const seen = new Set<string>();
  const images: string[] = [];
  let totalCount = 0;

  for (const host of ['vk.com', 'vk.ru'] as const) {
    const firstPage = await fetchVkAlPhotosPage(host, ownerId, albumId, 0);
    if (firstPage && firstPage.images.length > 0) {
      totalCount = firstPage.total || firstPage.images.length;
      for (const url of firstPage.images) {
        const key = url.split('?')[0];
        if (!seen.has(key)) {
          seen.add(key);
          images.push(url);
        }
      }

      // Load subsequent batches in parallel up to maxPhotos
      const offsets: number[] = [];
      for (let off = 10; off < Math.min(totalCount, maxPhotos); off += 10) {
        offsets.push(off);
      }

      if (offsets.length > 0) {
        const extraPages = await Promise.all(
          offsets.map((off) => fetchVkAlPhotosPage(host, ownerId, albumId, off))
        );
        for (const page of extraPages) {
          if (!page) continue;
          for (const url of page.images) {
            if (images.length >= maxPhotos) break;
            const key = url.split('?')[0];
            if (!seen.has(key)) {
              seen.add(key);
              images.push(url);
            }
          }
        }
      }

      if (images.length > 0) {
        return { images, total: totalCount };
      }
    }
  }

  // Fallback to public HTML album page on both vk.com and vk.ru
  const [vkComHtml, vkRuHtml] = await Promise.all([
    fetchPublicVkAlbumHtml(`https://vk.com/album${ownerId}_${albumId}`),
    fetchPublicVkAlbumHtml(`https://vk.ru/album${ownerId}_${albumId}`),
  ]);

  const htmlImages = extractVkPublicAlbumPhotoUrls(`${vkComHtml || ''}\n${vkRuHtml || ''}`, maxPhotos);
  return { images: htmlImages, total: htmlImages.length };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'lavka-zombie-api' });
  });

  app.get('/api/photo', async (req, res) => {
    const rawId = typeof req.query.id === 'string' ? req.query.id : undefined;
    try {
      const result = await fetchDecodedProductPhoto(rawId);
      if (!result.ok) {
        res.status(result.status).end(result.message);
        return;
      }
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(result.buffer);
    } catch {
      res.status(500).end('Internal Error');
    }
  });

  // Simple public VK album photo importer (no service token, extracts public photo URLs only)
  app.post('/api/vk/import', verifyAdminMiddleware, async (req, res) => {
    const body = (req.body || {}) as { albumId?: string };
    const rawInput = typeof body.albumId === 'string' ? body.albumId : '';

    if (isVkAlbumsListUrl(rawInput)) {
      res.status(400).json({
        error:
          'Вы вставили ссылку на общий список альбомов (albums-...). Откройте конкретный альбом в ВК (например, vk.ru/album-139575762_241285866) и вставьте его ссылку или ID (241285866).',
      });
      return;
    }

    const parsed = parseVkAlbumInput(rawInput, DEFAULT_VK_OWNER_ID);
    if (!parsed) {
      res.status(400).json({
        error:
          'Укажите ID альбома ВК (например, 241285866 или ссылку vk.ru/album-139575762_241285866).',
      });
      return;
    }

    const { images, total } = await fetchPublicVkAlbumImages(parsed.ownerId, parsed.albumId, 50);

    if (images.length === 0) {
      res.status(404).json({
        error:
          'В открытом доступе фотографии этого альбома не найдены. Убедитесь, что альбом публичный и ID указан верно.',
      });
      return;
    }

    res.json({ images, total });
  });

  // Image download helper for admin export (handles CORS for external VK/Storage images)
  app.get('/api/download-image', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const rawName = typeof req.query.name === 'string' ? req.query.name.trim() : 'lavka-zombie-photo.jpg';
    const safeFilename =
      rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'lavka-zombie-photo.jpg';

    if (!rawUrl || rawUrl.length > 1000) {
      res.status(400).json({ error: 'Некорректная ссылка на фото.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Некорректный URL изображения.' });
      return;
    }

    if (parsedUrl.protocol !== 'https:' || isPrivateOrLocalHost(parsedUrl.hostname)) {
      res.status(400).json({ error: 'Доступ к указанному адресу запрещён.' });
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const upstream = await fetch(parsedUrl.toString(), { signal: controller.signal });
      clearTimeout(timer);

      if (!upstream.ok) {
        res.status(502).json({ error: 'Не удалось скачать изображение.' });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        res.status(400).json({ error: 'Ссылка не ведёт на изображение.' });
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.send(buffer);
    } catch {
      res.status(504).json({ error: 'Превышено время ожидания при загрузке фото.' });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lavka Zombie server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start Lavka Zombie server:', err);
  process.exit(1);
});
