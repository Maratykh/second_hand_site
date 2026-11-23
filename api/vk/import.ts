const DEFAULT_VK_OWNER_ID = process.env.VK_OWNER_ID || '-139575762';

function parseVkAlbumInput(input: string, defaultOwnerId = '-139575762') {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  const fullMatch =
    trimmed.match(/album(-?\d+)_(\d+)/i) || trimmed.match(/^(-?\d+)_(\d+)$/);
  if (fullMatch) {
    return { ownerId: fullMatch[1], albumId: fullMatch[2] };
  }

  if (/^\d{1,20}$/.test(trimmed)) {
    return { ownerId: defaultOwnerId, albumId: trimmed };
  }

  return null;
}

function parseVkItemDescription(text: string) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  let price = 0;
  let size = 'M';
  let category = 'hoodies';

  for (const line of lines) {
    if (
      !title &&
      !line.startsWith('👉') &&
      !line.startsWith('http') &&
      !/^(цена|размер|price|size)/i.test(line)
    ) {
      title = line.replace(/^[•*\-\s]+/, '').slice(0, 100);
    }

    const priceMatch = line.match(/(?:цена|price)[:\s]*(\d+)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10);
    }

    const sizeMatch = line.match(/(?:размер|size)[:\s]*([a-zA-Z0-9\s/-]+)/i);
    if (sizeMatch) {
      const raw = sizeMatch[1].trim().toUpperCase();
      if (['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'].includes(raw)) {
        size = raw;
      }
    }
  }

  if (!title) {
    title = 'Винтажная позиция';
  }

  const lower = (title + ' ' + (text || '')).toLowerCase();
  if (/свитшот|худи|байк|толстовк|кардиган|лонгслив/i.test(lower)) {
    category = 'hoodies';
  } else if (/куртк|косух|ветровк|бомбер|пуховик/i.test(lower)) {
    category = 'jackets';
  } else if (/футболк|майк|поло/i.test(lower)) {
    category = 'tshirts';
  } else if (/джинс|брюк|штаны|шорт/i.test(lower)) {
    category = 'pants';
  } else if (/сумк|кепк|шапк|ремень|аксессуар/i.test(lower)) {
    category = 'accessories';
  }

  return { title, price, size, category };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = (req.body || {}) as { albumId?: string; token?: string };
    const rawInput = typeof body.albumId === 'string' ? body.albumId.trim() : '';

    if (!rawInput) {
      return res.status(400).json({
        error: 'Вставьте ссылку на альбом ВК (например, https://vk.ru/album-139575762_241285866).',
      });
    }

    const parsed = parseVkAlbumInput(rawInput, DEFAULT_VK_OWNER_ID);
    if (!parsed) {
      return res.status(400).json({
        error: 'Не удалось распознать ID альбома. Укажите ссылку вида vk.ru/album-139575762_241285866.',
      });
    }

    const vkToken = body.token?.trim() || process.env.VK_SERVICE_TOKEN || '';

    // If VK token is provided, use official VK API with extended=1 for full titles, prices and sizes
    if (vkToken) {
      const apiUrl = `https://api.vk.com/method/photos.get?owner_id=${encodeURIComponent(
        parsed.ownerId
      )}&album_id=${encodeURIComponent(
        parsed.albumId
      )}&extended=1&count=200&access_token=${encodeURIComponent(vkToken)}&v=5.199`;

      const apiRes = await fetch(apiUrl);
      const apiData = (await apiRes.json()) as any;

      if (apiData.error) {
        return res.status(400).json({
          error: `Ошибка VK API: ${apiData.error.error_msg || JSON.stringify(apiData.error)}`,
        });
      }

      const items = (apiData.response?.items || []).map((item: any) => {
        const text = item.text || '';
        const parsedDesc = parseVkItemDescription(text);

        const sizes = item.sizes || [];
        const typeOrder = ['w', 'z', 'y', 'x', 'm', 's'];
        let bestUrl = '';
        for (const t of typeOrder) {
          const found = sizes.find((s: any) => s.type === t);
          if (found?.url) {
            bestUrl = found.url;
            break;
          }
        }
        if (!bestUrl && sizes.length > 0) {
          bestUrl = sizes[sizes.length - 1]?.url || '';
        }

        return {
          title: parsedDesc.title,
          price: parsedDesc.price,
          size: parsedDesc.size,
          category: parsedDesc.category,
          description: text,
          image: bestUrl,
        };
      });

      return res.status(200).json({
        items,
        images: items.map((i: any) => i.image).filter(Boolean),
        total: apiData.response?.count || items.length,
      });
    }

    // Fallback: public fetch
    const albumUrl = `https://vk.com/album${parsed.ownerId}_${parsed.albumId}`;
    const pageRes = await fetch(albumUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    const html = await pageRes.text();
    const urlMatches =
      html.match(/https?:\/\/(?:sun\d+-\d+|pp|cs\d+)\.(?:userapi\.com|vkuserphoto\.ru)\/[^\s"'<>\\)]+/gi) || [];

    const seen = new Set<string>();
    const images: string[] = [];
    for (const url of urlMatches) {
      const clean = url.replace(/\\\//g, '/').replace(/&amp;/g, '&');
      const baseKey = clean.split('?')[0];
      if (!seen.has(baseKey)) {
        seen.add(baseKey);
        images.push(clean);
      }
    }

    const items = images.map((img) => ({
      title: 'Винтажная позиция',
      price: 0,
      size: 'M',
      category: 'hoodies',
      description: '',
      image: img,
    }));

    return res.status(200).json({
      items,
      images,
      total: items.length,
      needTokenNotice:
        images.length === 0
          ? 'ВКонтакте временно блокирует прямые серверные запросы к этому альбому. Воспользуйтесь кнопкой «Мгновенный импорт из соседней вкладки ВК» ниже.'
          : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Ошибка сервера: ${err?.message || 'Не удалось загрузить альбом'}`,
    });
  }
}
