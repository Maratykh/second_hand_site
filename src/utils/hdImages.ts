const PRODUCT_HD_MAP_URL = '/data/productHdImages.json';

let cachedHdMapPromise: Promise<Record<string, string>> | null = null;

/**
 * Checks whether a product image URL still points to its static seeded local asset
 * so admin-edited custom photos are never overridden by archival HD URLs.
 */
export function isSeededLocalProductImage(
  productId: string,
  imageUrl: string | undefined
): boolean {
  if (!productId || !imageUrl) return false;
  return imageUrl === `/assets/products/${productId}.webp`;
}

/**
 * Selects the best available VK CDN width from the signed `as=` list up to `preferredMaxWidth`
 * and updates `cs=` accordingly. Returns the original URL unchanged if parameters are absent.
 */
export function pickVkResolutionUrl(
  rawUrl: string,
  preferredMaxWidth: number = 1620
): string {
  if (!rawUrl || !rawUrl.startsWith('https://')) return rawUrl;

  const asMatch = rawUrl.match(/(?:[?&])as=([^&]+)/);
  if (!asMatch || !/[?&]cs=\d+x\d+/.test(rawUrl)) {
    return rawUrl;
  }

  const widths = asMatch[1]
    .split(',')
    .map((entry) => Number(entry.split('x')[0]))
    .filter((w) => Number.isFinite(w) && w > 0);

  if (widths.length === 0) {
    return rawUrl;
  }

  const fitting = widths.filter((w) => w <= preferredMaxWidth);
  const chosenWidth =
    fitting.length > 0 ? Math.max(...fitting) : Math.min(...widths);

  return rawUrl.replace(/([?&]cs=)\d+x\d+/, `$1${chosenWidth}x0`);
}

/**
 * Lazily fetches and caches the archival HD URL manifest once per session.
 * Never runs on the storefront or catalog grid pages.
 */
export function loadProductHdImageMap(): Promise<Record<string, string>> {
  if (!cachedHdMapPromise) {
    cachedHdMapPromise = fetch(PRODUCT_HD_MAP_URL, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return {};
        }
        return data as Record<string, string>;
      })
      .catch(() => {
        cachedHdMapPromise = null;
        return {};
      });
  }

  return cachedHdMapPromise;
}

/**
 * Preloads and decodes an image off-DOM with `no-referrer` before swapping it in UI.
 */
export function preloadHdImage(url: string, timeoutMs: number = 12000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('HD image load timeout'));
    }, timeoutMs);

    img.onload = () => {
      if (settled) return;
      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(url);
      };
      if (typeof img.decode === 'function') {
        img.decode().then(done, done);
      } else {
        done();
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('HD image failed to load'));
    };

    img.src = url;
  });
}

/**
 * Resolves and preloads an archival HD URL for unedited seeded product images.
 * Returns null cleanly if no HD URL exists or loading fails.
 */
export async function resolvePreloadedHdUrl(
  productId: string,
  baseUrl: string | undefined,
  preferredMaxWidth: number = 1620
): Promise<string | null> {
  if (!isSeededLocalProductImage(productId, baseUrl)) {
    return null;
  }

  try {
    const hdMap = await loadProductHdImageMap();
    const rawHdUrl = hdMap[productId];
    if (!rawHdUrl) return null;

    const targetUrl = pickVkResolutionUrl(rawHdUrl, preferredMaxWidth);
    return await preloadHdImage(targetUrl);
  } catch {
    return null;
  }
}
