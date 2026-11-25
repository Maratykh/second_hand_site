import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDecodedProductPhoto } from './_lib/firebaseRest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  try {
    const result = await fetchDecodedProductPhoto(rawId);
    if (!result.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(result.status).end(result.message);
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=31536000, immutable');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.status(200).send(result.buffer);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).end('Internal Error');
  }
}
