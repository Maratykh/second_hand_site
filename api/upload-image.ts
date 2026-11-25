import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminHashViaFirestore } from './_lib/firebaseRest';

interface UploadBody {
  adminHash?: string;
  dataUrl?: string;
}

const GITHUB_REPO = process.env.GITHUB_REPO || 'Maratykh/second_hand_sitea';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body as UploadBody | undefined;
  const adminHash = typeof body?.adminHash === 'string' ? body.adminHash.trim() : '';
  const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl.trim() : '';

  if (!(await verifyAdminHashViaFirestore(adminHash))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const match = dataUrl.match(DATA_URL_RE);
  if (!match || dataUrl.length > 280_000) {
    return res.status(400).json({ error: 'Invalid or oversized image payload' });
  }

  if (!GITHUB_TOKEN) {
    return res.status(200).json({ uploaded: false, reason: 'no_github_token' });
  }

  const mime = match[1].toLowerCase();
  const ext = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
  const rawBase64 = match[2];
  const photoId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const repoPath = `uploads/${photoId}.${ext}`;
  const ghUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`;

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
        branch: GITHUB_BRANCH,
      }),
    });

    if (!putRes.ok) {
      return res.status(200).json({ uploaded: false, reason: `github_${putRes.status}` });
    }

    const putData = (await putRes.json()) as { commit?: { sha?: string } };
    const ref = putData.commit?.sha || GITHUB_BRANCH;
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@${ref}/${repoPath}`;

    return res.status(200).json({
      uploaded: true,
      url: cdnUrl,
      storage: 'github-cdn',
    });
  } catch {
    return res.status(200).json({ uploaded: false, reason: 'network_error' });
  }
}
