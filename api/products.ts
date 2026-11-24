import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ProductPayload {
  title: string;
  price: number;
  category: string;
  sizes: string[];
  description?: string;
  measurements?: {
    length?: string;
    width?: string;
    sleeve?: string;
  };
  inStock?: boolean;
  status?: 'published' | 'draft';
  imageBase64?: string;
}

const GITHUB_REPO = process.env.GITHUB_REPO || 'Maratykh/second_hand_sitea';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function commitFileToGitHub(path: string, contentBase64: string, message: string) {
  if (!GITHUB_TOKEN) return false;

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  
  // Check if file already exists to get SHA
  let sha: string | undefined;
  try {
    const checkRes = await fetch(url + `?ref=${GITHUB_BRANCH}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Zombie-Backend',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }
  } catch {}

  const body: Record<string, unknown> = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'Vercel-Zombie-Backend',
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return putRes.ok;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch existing custom products
  if (req.method === 'GET') {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/public/data/customProducts.json`;
      const ghRes = await fetch(rawUrl, {
        headers: GITHUB_TOKEN
          ? { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'Vercel-Zombie-Backend' }
          : { 'User-Agent': 'Vercel-Zombie-Backend' },
      });
      if (ghRes.ok) {
        const data = await ghRes.json();
        return res.status(200).json(data);
      }
    } catch {}

    // Fallback: empty array
    return res.status(200).json([]);
  }

  // POST: Add new custom product
  if (req.method === 'POST') {
    try {
      const body = req.body as ProductPayload;
      if (!body || !body.title || !body.price) {
        return res.status(400).json({ error: 'Пожалуйста, укажите название и цену вещи' });
      }

      const productId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let finalImagePath = body.imageBase64 && body.imageBase64.startsWith('http')
        ? body.imageBase64
        : '';

      // If user uploaded a base64 image and GITHUB_TOKEN is configured:
      if (body.imageBase64 && body.imageBase64.includes(';base64,')) {
        const [meta, rawBase64] = body.imageBase64.split(';base64,');
        const ext = meta.includes('webp') ? 'webp' : meta.includes('png') ? 'png' : 'jpg';
        const imagePath = `public/assets/uploads/${productId}.${ext}`;

        if (GITHUB_TOKEN) {
          const uploaded = await commitFileToGitHub(
            imagePath,
            rawBase64,
            `feat(catalog): add image for product ${productId} [skip ci]`
          );
          if (uploaded) {
            finalImagePath = `/assets/uploads/${productId}.${ext}`;
          }
        } else {
          // If token not set, we keep the compressed data URL for local storage
          finalImagePath = body.imageBase64;
        }
      }

      const newProduct = {
        id: productId,
        title: body.title.trim(),
        description: (body.description || '').trim(),
        price: Number(body.price),
        currency: 'BYN' as const,
        category: body.category || 'jackets',
        sizes: body.sizes && body.sizes.length > 0 ? body.sizes : ['M'],
        images: finalImagePath ? [finalImagePath] : ['/assets/images/hero_banner.jpg'],
        era: 'Винтаж',
        condition: 'Отличное винтажное',
        measurements: body.measurements || {},
        status: body.status || 'published',
        inStock: body.inStock ?? true,
        featured: false,
        createdAt: new Date().toISOString(),
      };

      // If GITHUB_TOKEN is present, append to public/data/customProducts.json
      if (GITHUB_TOKEN && finalImagePath && !finalImagePath.startsWith('data:')) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/public/data/customProducts.json`;
          const currentRes = await fetch(rawUrl, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'Vercel-Zombie-Backend' },
          });
          const currentList = currentRes.ok ? await currentRes.json() : [];
          const updatedList = [newProduct, ...currentList.filter((p: { id: string }) => p.id !== productId)];

          const jsonContentBase64 = Buffer.from(JSON.stringify(updatedList, null, 2), 'utf-8').toString('base64');
          await commitFileToGitHub(
            'public/data/customProducts.json',
            jsonContentBase64,
            `feat(catalog): add new product "${newProduct.title}" (${productId})`
          );
        } catch (commitErr) {
          console.warn('Failed to commit customProducts.json to GitHub:', commitErr);
        }
      }

      return res.status(200).json({
        success: true,
        product: newProduct,
        persistedToGit: Boolean(GITHUB_TOKEN && finalImagePath && !finalImagePath.startsWith('data:')),
        message: GITHUB_TOKEN
          ? 'Товар успешно сохранён в проект и отправлен на публикацию!'
          : 'Товар сохранён локально. Укажите GITHUB_TOKEN в Vercel для автоматического сохранения в Git.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
