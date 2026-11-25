import type { Product } from '../types/store';

export type FeedProductEntry = Omit<Product, 'id'> & {
  createdAtMs?: number;
  updatedAtMs?: number;
};

export type FirestoreRestValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
};

export function decodeFirestoreValue(val: FirestoreRestValue | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((v) => decodeFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      const decoded = decodeFirestoreValue(v);
      if (decoded !== undefined) out[k] = decoded;
    }
    return out;
  }
  return undefined;
}

export function decodeFeedItems(raw: unknown): Record<string, FeedProductEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, FeedProductEntry> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entry = value as FeedProductEntry;
      if (typeof entry.title === 'string' && Array.isArray(entry.images)) {
        out[id] = entry;
      }
    }
  }
  return out;
}

export function buildFeedProductList(
  primary: Record<string, FeedProductEntry>,
  overflow: Record<string, FeedProductEntry> = {}
): Product[] {
  const combined = new Map<string, FeedProductEntry>();
  for (const [id, entry] of Object.entries(overflow)) {
    combined.set(id, entry);
  }
  for (const [id, entry] of Object.entries(primary)) {
    combined.set(id, entry);
  }

  return Array.from(combined.entries())
    .sort(([, a], [, b]) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .map(([id, entry]) => {
      const rest = { ...entry };
      delete rest.createdAtMs;
      delete rest.updatedAtMs;
      return {
        id,
        ...(rest as Omit<Product, 'id'>),
      };
    });
}

const FEED_SHARD_CHAR_THRESHOLD = 650_000;

export function selectFeedShardForProduct(
  productId: string,
  primary: Record<string, FeedProductEntry>,
  overflow: Record<string, FeedProductEntry>
): 'catalog_feed' | 'catalog_feed_2' {
  if (overflow[productId]) return 'catalog_feed_2';
  if (primary[productId]) return 'catalog_feed';
  try {
    if (JSON.stringify(primary).length > FEED_SHARD_CHAR_THRESHOLD) {
      return 'catalog_feed_2';
    }
  } catch {
    return 'catalog_feed';
  }
  return 'catalog_feed';
}

export async function uploadImageViaApiEndpoint(
  adminHash: string,
  dataUrl: string
): Promise<string | null> {
  if (!adminHash || !dataUrl.startsWith('data:')) return null;
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminHash, dataUrl }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { uploaded?: boolean; url?: string };
    return data.uploaded && typeof data.url === 'string' && data.url ? data.url : null;
  } catch {
    return null;
  }
}
