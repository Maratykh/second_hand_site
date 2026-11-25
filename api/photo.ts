import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fundamental-inverter-l91ww';
const FIREBASE_DB_ID =
  process.env.FIREBASE_DB_ID || 'ai-studio-remixremix-521d0fff-033e-415a-8e15-0c73d96d03e5';
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyBosVDYGZUauLmHZna4Jw9Yo7TjAeEznuw';

const VALID_PHOTO_ID_RE = /^[a-zA-Z0-9_-]{3,128}$/;
const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|jpg|png|gif));base64,([A-Za-z0-9+/=]+)$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!rawId || !VALID_PHOTO_ID_RE.test(rawId)) {
    return res.status(400).json({ error: 'Invalid photo ID' });
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DB_ID}/documents/product_photos/${encodeURIComponent(rawId)}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
    const fsRes = await fetch(docUrl);

    if (!fsRes.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(fsRes.status === 404 ? 404 : 502).end('Not Found');
    }

    const docJson = (await fsRes.json()) as {
      fields?: { dataUrl?: { stringValue?: string } };
    };

    const dataUrl = docJson.fields?.dataUrl?.stringValue;
    const match = dataUrl ? dataUrl.match(DATA_URL_RE) : null;
    if (!match) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).end('Invalid photo payload');
    }

    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=31536000, immutable');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.status(200).send(buffer);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).end('Internal Error');
  }
}
