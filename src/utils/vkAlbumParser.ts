export interface ParsedVkAlbum {
  ownerId: string;
  albumId: string;
}

export function isVkAlbumsListUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // Matches links like https://vk.ru/albums-139575762 without an embedded ?z=album...
  return /albums-?\d+/i.test(trimmed) && !/album-?\d+_\d+/i.test(decodeSafe(trimmed));
}

function decodeSafe(value: string): string {
  try {
    return value.includes('%') ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

export function parseVkAlbumInput(
  input: string,
  defaultOwnerId = '-139575762'
): ParsedVkAlbum | null {
  const trimmed = decodeSafe(input.trim());
  if (!trimmed) return null;

  const fullMatch =
    trimmed.match(/album(-?\d+)_(\d+)/i) || trimmed.match(/^(-?\d+)_(\d+)$/);
  if (fullMatch) {
    return {
      ownerId: fullMatch[1],
      albumId: fullMatch[2],
    };
  }

  if (/^\d{1,20}$/.test(trimmed)) {
    return {
      ownerId: defaultOwnerId,
      albumId: trimmed,
    };
  }

  return null;
}

export function normalizeVkPhotoUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  let cleaned = rawUrl
    .trim()
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/[);,'"]+$/, '');

  if (cleaned.startsWith('http://')) {
    cleaned = `https://${cleaned.slice('http://'.length)}`;
  }

  if (!cleaned.startsWith('https://') || cleaned.length > 1000) {
    return null;
  }

  // Upgrade small album thumbnail query param (e.g. cs=240x0) to sharp 1280px preview
  if (/[?&]cs=(?:240|320|400|604)x0\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/([?&]cs=)(?:240|320|400|604)x0\b/gi, '$11280x0');
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') return null;
    const result = parsed.toString();
    return result.length <= 1000 ? result : null;
  } catch {
    return null;
  }
}

function isSkippableVkAsset(url: string): boolean {
  if (/crop=/i.test(url)) return true;
  if (/\.png(?:\?|$)/i.test(url)) return true;
  if (/[?&]size=(?:50x50|100x100|200x200)\b/i.test(url)) return true;
  if (
    /camera_|deactivated|community_|\/s_\d+|type=album|c_uniq_tag/i.test(url) &&
    !/impg|impf|\/s\/v1\//i.test(url)
  ) {
    return true;
  }
  return false;
}

export function extractVkPhotosFromAlPhotosPayload(
  rawJsonText: string,
  limit = 60
): { total: number; images: string[] } {
  if (!rawJsonText) return { total: 0, images: [] };

  let parsed: unknown;
  try {
    // VK occasionally prefixes AJAX JSON with "<!--"
    const jsonText = rawJsonText.replace(/^\s*<!--/, '').trim();
    parsed = JSON.parse(jsonText);
  } catch {
    return { total: 0, images: [] };
  }

  const root = parsed as { payload?: unknown[] };
  const inner = Array.isArray(root?.payload) ? root.payload[1] : null;
  if (!Array.isArray(inner)) {
    return { total: 0, images: [] };
  }

  const total = typeof inner[1] === 'number' ? inner[1] : 0;
  const items = Array.isArray(inner[3]) ? inner[3] : [];

  const seenKeys = new Set<string>();
  const images: string[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const candidate =
      (typeof record.z_src === 'string' && record.z_src) ||
      (typeof record.y_src === 'string' && record.y_src) ||
      (typeof record.x_src === 'string' && record.x_src) ||
      (typeof record.w_src === 'string' && record.w_src) ||
      (typeof record.base_src === 'string' && record.base_src) ||
      '';

    const normalized = normalizeVkPhotoUrl(candidate);
    if (!normalized || isSkippableVkAsset(normalized)) continue;

    const baseKey = normalized.split('?')[0];
    if (seenKeys.has(baseKey)) continue;
    seenKeys.add(baseKey);
    images.push(normalized);

    if (images.length >= limit) break;
  }

  return { total, images };
}

export function extractVkPublicAlbumPhotoUrls(html: string, limit = 60): string[] {
  if (!html) return [];
  const normalized = html.replace(/\\\//g, '/').replace(/&amp;/g, '&');

  // Prefer actual album grid rows when present so og:image cover & avatars are excluded
  const rowMatches = normalized.match(
    /id="photo_row_[^"]+"[\s\S]{0,600}?background-image:\s*url\(([^)]+)\)/gi
  );
  const searchSource =
    rowMatches && rowMatches.length > 0 ? rowMatches.join('\n') : normalized;

  const urlMatches =
    searchSource.match(
      /https?:\/\/(?:sun\d+-\d+|pp|cs\d+)\.(?:userapi\.com|vkuserphoto\.ru)\/[^\s"'<>\\)]+/gi
    ) || [];

  const seenKeys = new Set<string>();
  const results: string[] = [];

  for (const rawUrl of urlMatches) {
    const safe = normalizeVkPhotoUrl(rawUrl);
    if (!safe || isSkippableVkAsset(safe)) continue;

    const baseKey = safe.split('?')[0];
    if (seenKeys.has(baseKey)) continue;
    seenKeys.add(baseKey);
    results.push(safe);

    if (results.length >= limit) break;
  }

  return results;
}
