import type { VercelRequest, VercelResponse } from '@vercel/node';

interface UploadBody {
  adminHash?: string;
  dataUrl?: string;
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fundamental-inverter-l91ww';
const FIREBASE_DB_ID =
  process.env.FIREBASE_DB_ID || 'ai-studio-remixremix-521d0fff-033e-415a-8e15-0c73d96d03e5';
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyBosVDYGZUauLmHZna4Jw9Yo7TjAeEznuw';

// Only commit to GitHub + jsDelivr when an explicit PUBLIC media repo is configured;
// private code repositories return 404 on jsDelivr/raw CDN.
const GITHUB_MEDIA_REPO = process.env.GITHUB_MEDIA_REPO;
const GITHUB_MEDIA_BRANCH = process.env.GITHUB_MEDIA_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/i;

async function verifyAdminHash(adminHash: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(adminHash)) return false;
  const docName = `projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DB_ID}/documents/admin_auth/session`;
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DB_ID}/documents:commit?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: { hash: { stringValue: adminHash } },
            },
            updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body as UploadBody | undefined;
  const adminHash = typeof body?.adminHash === 'string' ? body.adminHash.trim() : '';
  const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl.trim() : '';

  if (!(await verifyAdminHash(adminHash))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const match = dataUrl.match(DATA_URL_RE);
  if (!match || dataUrl.length > 280_000) {
    return res.status(400).json({ error: 'Invalid or oversized image payload' });
  }

  if (!GITHUB_TOKEN || !GITHUB_MEDIA_REPO) {
    return res.status(200).json({ uploaded: false, reason: 'use_edge_photo_proxy' });
  }

  const mime = match[1].toLowerCase();
  const ext = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
  const rawBase64 = match[2];
  const photoId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const repoPath = `uploads/${photoId}.${ext}`;
  const ghUrl = `https://api.github.com/repos/${GITHUB_MEDIA_REPO}/contents/${repoPath}`;

  try {
    const putRes = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Vercel-Zombie-Media',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore(media): upload ${photoId}.${ext} [skip ci]`,
        content: rawBase64,
        branch: GITHUB_MEDIA_BRANCH,
      }),
    });

    if (!putRes.ok) {
      return res.status(200).json({ uploaded: false, reason: `github_${putRes.status}` });
    }

    const putData = (await putRes.json()) as { commit?: { sha?: string } };
    const ref = putData.commit?.sha || GITHUB_MEDIA_BRANCH;
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_MEDIA_REPO}@${ref}/${repoPath}`;

    return res.status(200).json({
      uploaded: true,
      url: cdnUrl,
      storage: 'github-cdn',
    });
  } catch {
    return res.status(200).json({ uploaded: false, reason: 'network_error' });
  }
}
