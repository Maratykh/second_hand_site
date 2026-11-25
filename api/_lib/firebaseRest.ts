import fs from 'node:fs';
import path from 'node:path';

export interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

let cachedConfig: FirebaseConfig | null = null;

export function getFirebaseConfig(): FirebaseConfig {
  if (cachedConfig) return cachedConfig;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseConfig;
  return cachedConfig;
}

/**
 * Verifies an admin SHA-256 hash using Firestore security rules on /admin_auth/session.
 */
export async function verifyAdminHashViaFirestore(adminHash: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(adminHash)) return false;
  const cfg = getFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  const docName = `projects/${cfg.projectId}/databases/${dbId}/documents/admin_auth/session`;
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents:commit?key=${encodeURIComponent(cfg.apiKey)}`;

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
            updateTransforms: [
              { fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' },
            ],
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const VALID_PHOTO_ID_RE = /^[a-zA-Z0-9_-]{3,128}$/;
const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|jpg|png|gif));base64,([A-Za-z0-9+/=]+)$/i;

export async function fetchDecodedProductPhoto(
  rawId: string | undefined
): Promise<{ ok: true; mimeType: string; buffer: Buffer } | { ok: false; status: number; message: string }> {
  if (!rawId || !VALID_PHOTO_ID_RE.test(rawId)) {
    return { ok: false, status: 400, message: 'Invalid photo ID' };
  }

  const cfg = getFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  const docUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents/product_photos/${encodeURIComponent(rawId)}?key=${encodeURIComponent(cfg.apiKey)}`;

  const fsRes = await fetch(docUrl);
  if (!fsRes.ok) {
    return {
      ok: false,
      status: fsRes.status === 404 ? 404 : 502,
      message: 'Not Found',
    };
  }

  const docJson = (await fsRes.json()) as {
    fields?: { dataUrl?: { stringValue?: string } };
  };

  const dataUrl = docJson.fields?.dataUrl?.stringValue;
  const match = dataUrl ? dataUrl.match(DATA_URL_RE) : null;
  if (!match) {
    return { ok: false, status: 404, message: 'Invalid photo payload' };
  }

  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  return { ok: true, mimeType, buffer };
}
